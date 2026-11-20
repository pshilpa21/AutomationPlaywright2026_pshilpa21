import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explainFailures, type RunSummary } from '../src/ai/triage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const compose = ['compose', 'up', '--detach', '--wait', '--wait-timeout', '120', 'juice-shop'];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function dockerInfo(): { ready: boolean; error: string } {
  const result = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    ready: result.status === 0,
    error: [result.stderr, result.error?.message].filter(Boolean).join('\n').trim(),
  };
}

async function startDockerDesktopIfNeeded(): Promise<void> {
  const initialProbe = dockerInfo();
  if (initialProbe.ready) return;
  if (/permission denied|access is denied/i.test(initialProbe.error)) {
    throw new Error('Docker Engine is present but this process cannot access its control pipe. Starting Docker Desktop will not fix this permission boundary; run the command from a terminal allowed to access Docker, or use a CI runner with Docker enabled.');
  }
  if (process.env.CI) throw new Error('Docker Engine is unavailable in CI. Start the CI runner with Docker enabled.');

  if (isWindows) {
    const candidates = [
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'DockerDesktop', 'Docker Desktop.exe'),
    ];
    let executable: string | undefined;
    for (const candidate of candidates) {
      try { await fs.access(candidate); executable = candidate; break; } catch { /* try next install location */ }
    }
    if (!executable) throw new Error('Docker Desktop is installed nowhere in the standard Windows locations. Start Docker Desktop once, or update scripts/run-ui.ts for its install path.');
    const child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } else if (process.platform === 'darwin') {
    const child = spawn('open', ['-a', 'Docker'], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    throw new Error('Docker Engine is not running. Start the Docker service, then rerun this command.');
  }

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const probe = dockerInfo();
    if (probe.ready) return;
    if (/permission denied|access is denied/i.test(probe.error)) {
      throw new Error('Docker Engine started, but this process cannot access its control pipe. Run the command from a terminal allowed to access Docker, or use a CI runner with Docker enabled.');
    }
    await sleep(2_000);
  }
  throw new Error('Docker Desktop did not become ready within 3 minutes. Check Docker Desktop and rerun.');
}

function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): number {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

async function waitForJuiceShop(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${process.env.JUICE_SHOP_PORT ?? '3001'}`;
  const deadline = Date.now() + 120_000;
  let lastProblem = 'the page has not responded yet';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL, { signal: AbortSignal.timeout(3_000) });
      if (response.status < 500) {
        console.log(`Juice Shop is responding at ${baseURL} (HTTP ${response.status}).`);
        return;
      }
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await sleep(1_000);
  }

  throw new Error(`Juice Shop did not respond at ${baseURL} within 2 minutes (${lastProblem}). Check "npm run env:logs".`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const aiTriage = args.includes('--ai-triage');
  const playwrightArgs = args.filter((arg) => arg !== '--ai-triage');

  try {
    await startDockerDesktopIfNeeded();
    const composeExit = run('docker', compose);
    if (composeExit !== 0) throw new Error(`Docker Compose failed with exit code ${composeExit}. Check Docker Desktop and run "npm run env:logs" for target logs.`);
    await waitForJuiceShop();

    await fs.rm(path.join(root, 'allure-results'), { recursive: true, force: true });
    await fs.rm(path.join(root, 'artifacts', 'run-summary.json'), { force: true });
    const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
    const testExit = run(process.execPath, [cli, 'test', ...playwrightArgs]);

    const allureCli = path.join(root, 'node_modules', 'allure', 'cli.js');
    const reportExit = run(process.execPath, [allureCli, 'generate', 'allure-results', '--clean', '-o', 'allure-report']);
    if (reportExit !== 0) console.error('Allure report generation failed. Test results remain in allure-results/.');

    if (aiTriage && testExit !== 0) {
      const summaryPath = path.join(root, 'artifacts', 'run-summary.json');
      const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8')) as RunSummary;
      const analysis = await explainFailures(summary);
      const triagePath = path.join(root, 'artifacts', 'ai-triage.md');
      await fs.writeFile(triagePath, `# AI failure triage\n\nGenerated ${new Date().toISOString()}\n\n${analysis}\n`, 'utf8');
      console.log(`\nAI triage saved to ${path.relative(root, triagePath)}. Review it alongside the trace and Allure report.`);
    }
    process.exitCode = testExit || reportExit;
  } catch (error) {
    console.error(`\nTest run could not complete: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

void main();
