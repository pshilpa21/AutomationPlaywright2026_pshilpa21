import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explainFailures, type RunSummary } from '../src/ai/triage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const summaryPath = path.join(root, 'artifacts', 'run-summary.json');
try {
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8')) as RunSummary;
  const report = await explainFailures(summary);
  const outputPath = path.join(root, 'artifacts', 'ai-triage.md');
  await fs.writeFile(outputPath, `# AI failure triage\n\nGenerated ${new Date().toISOString()}\n\n${report}\n`, 'utf8');
  console.log(`AI analysis saved to ${path.relative(root, outputPath)}. Verify its suggestions against the Playwright trace and Allure report.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
