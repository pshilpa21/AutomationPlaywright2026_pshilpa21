import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const allowedProfiles = new Set(['smoke', 'load', 'stress', 'spike', 'soak']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function main(): Promise<void> {
  const profileArg = process.argv.slice(2).find((arg) => arg.startsWith('--profile='));
  const profile = profileArg?.split('=')[1] ?? 'smoke';
  if (!allowedProfiles.has(profile)) {
    throw new Error(`Unknown performance profile "${profile}". Choose one of: ${[...allowedProfiles].join(', ')}.`);
  }

  await startDockerIfNeeded();
  const targetExit = runDocker(['compose', 'up', '--detach', '--wait', '--wait-timeout', '120', 'juice-shop']);
  if (targetExit !== 0) throw new Error('Docker Compose could not start Juice Shop. Check "npm run env:logs".');
  await waitForTarget();

  await fs.mkdir(path.join(root, 'artifacts', 'performance'), { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const reportName = `${profile}-${runId}-report.html`;
  const summaryName = `${profile}-${runId}-summary.json`;
  const exitCode = runDocker([
    'compose', '--profile', 'performance', 'run', '--rm', '--no-deps', 'k6', 'run',
    '-e', `PROFILE=${profile}`,
    '-e', `RUN_ID=${runId}`,
    '/scripts/products-api.js',
  ]);
  if (exitCode !== 0) {
    console.error(`\nPerformance profile "${profile}" failed. Review the k6 metrics and thresholds above.`);
    process.exitCode = exitCode;
    return;
  }
  console.log(`\nVisual report: artifacts/performance/${reportName}`);
  console.log(`Raw metrics:   artifacts/performance/${summaryName}`);
}

void main().catch((error: unknown) => {
  console.error(`\nPerformance run could not complete: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
