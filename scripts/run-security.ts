import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const profiles = new Set(['baseline', 'full', 'dependencies', 'all']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const targetUrl = 'http://juice-shop:3000';

function runDocker(args: string[]): number {
  const result = spawnSync('docker', args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function dockerProbe(): { ready: boolean; error: string } {
  const result = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    ready: result.status === 0,
    error: [result.stderr, result.error?.message].filter(Boolean).join('\n').trim(),
  };
}

async function startDockerIfNeeded(): Promise<void> {
  const initial = dockerProbe();
  if (initial.ready) return;
  if (/permission denied|access is denied/i.test(initial.error)) {
    throw new Error('Docker is installed but this terminal cannot access the Docker Engine. Use a terminal with Docker access.');
  }
  if (process.env.CI) throw new Error('Docker Engine is unavailable in CI. Enable Docker on the CI runner.');

  if (isWindows) {
    const candidates = [
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
    ];
    let executable: string | undefined;
    for (const candidate of candidates) {
      try { await fs.access(candidate); executable = candidate; break; } catch { /* check next common install path */ }
    }
    if (!executable) throw new Error('Docker Desktop was not found in its standard Windows install locations. Start it manually and rerun.');
    const child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } else if (process.platform === 'darwin') {
    const child = spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    throw new Error('Docker Engine is not running. Start the Docker service, then rerun.');
  }

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const probe = dockerProbe();
    if (probe.ready) return;
    if (/permission denied|access is denied/i.test(probe.error)) {
      throw new Error('Docker started, but this terminal cannot access the Docker Engine. Use a terminal with Docker access.');
    }
    await sleep(2_000);
  }
  throw new Error('Docker Desktop did not become ready within 3 minutes. Check Docker Desktop and rerun.');
}

async function waitForTarget(): Promise<void> {
  const baseUrl = process.env.BASE_URL ?? `http://127.0.0.1:${process.env.JUICE_SHOP_PORT ?? '3001'}`;
  const deadline = Date.now() + 120_000;
  let lastError = 'the page has not responded yet';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(3_000) });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(1_000);
  }
  throw new Error(`Juice Shop did not respond at ${baseUrl} within 2 minutes (${lastError}). Check "npm run env:logs".`);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function runZapScan(kind: 'baseline' | 'full', runId: string): number {
  const reportStem = `${kind}-${runId}`;
  const scanScript = kind === 'baseline' ? 'zap-baseline.py' : 'zap-full-scan.py';
  const spiderMinutes = kind === 'baseline' ? '2' : '5';
  console.log(`\nStarting the ZAP ${kind} scan against the local Juice Shop container...`);
  return runDocker([
    'compose', '--profile', 'security', 'run', '--rm', '--no-deps', 'zap', scanScript,
    '-t', targetUrl,
    '-m', spiderMinutes,
    '-I',
    '-j',
    '-r', `/zap/wrk/${reportStem}.html`,
    '-J', `/zap/wrk/${reportStem}.json`,
  ]);
}

async function runDependencyAudit(runId: string): Promise<number> {
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';
  const audit = spawnSync(npmCommand, ['audit', '--audit-level=high', '--json'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    shell: isWindows,
  });
  const reportPath = path.join(root, 'artifacts', 'security', `dependencies-${runId}.json`);
  await fs.writeFile(reportPath, `${audit.stdout || audit.stderr || '{}'}\n`, 'utf8');

  if (audit.error) {
    console.error(`Dependency audit could not run: ${audit.error.message}`);
    return 1;
  }
  try {
    const report = JSON.parse(audit.stdout || '{}') as {
      metadata?: { vulnerabilities?: Record<string, number> };
    };
    const counts = report.metadata?.vulnerabilities ?? {};
    console.log(`\nDependency audit: critical=${counts.critical ?? 0}, high=${counts.high ?? 0}, moderate=${counts.moderate ?? 0}, low=${counts.low ?? 0}`);
    console.log(`Dependency JSON report: artifacts/security/dependencies-${runId}.json`);
  } catch {
    console.error(`Dependency audit did not return parseable JSON. Review artifacts/security/dependencies-${runId}.json`);
  }
  if (audit.status !== 0) console.error('Dependency audit reported vulnerabilities at or above the configured high severity threshold, or could not reach the package registry.');
  return audit.status ?? 1;
}

async function main(): Promise<void> {
  const profileArg = process.argv.slice(2).find((arg) => arg.startsWith('--profile='));
  const profile = profileArg?.split('=')[1] ?? 'all';
  if (!profiles.has(profile)) throw new Error(`Unknown security profile "${profile}". Choose one of: ${[...profiles].join(', ')}.`);

  await fs.mkdir(path.join(root, 'artifacts', 'security'), { recursive: true });
  const runId = timestamp();
  let exitCode = 0;

  if (profile === 'dependencies') {
    exitCode = await runDependencyAudit(runId);
  } else {
    await startDockerIfNeeded();
    const targetExit = runDocker(['compose', 'up', '--detach', '--wait', '--wait-timeout', '120', 'juice-shop']);
    if (targetExit !== 0) throw new Error('Docker Compose could not start Juice Shop. Check "npm run env:logs".');
    await waitForTarget();

    const scans: Array<'baseline' | 'full'> = profile === 'all'
      ? ['baseline', 'full']
      : profile === 'full' ? ['full'] : ['baseline'];
    for (const kind of scans) {
      const scanExit = runZapScan(kind, runId);
      console.log(`ZAP ${kind} reports: artifacts/security/${kind}-${runId}.html and .json`);
      if (scanExit !== 0) {
        console.error(`ZAP ${kind} scan exited with code ${scanExit}. Reports, if generated, are still available for review.`);
        exitCode ||= scanExit;
      }
    }

    if (profile === 'all') {
      const dependencyExit = await runDependencyAudit(runId);
      exitCode ||= dependencyExit;
    }
  }

  console.log(`\nSecurity artifacts are saved under artifacts/security/ with run ID ${runId}.`);
  process.exitCode = exitCode;
}

void main().catch((error: unknown) => {
  console.error(`\nSecurity run could not complete: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
