import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftUiScenario } from '../src/ai/scenario-planner.js';

const requirement = process.argv.slice(2).join(' ').trim();
if (!requirement) {
  console.error('Usage: npm run ai:plan -- "As a shopper, I can search for a product"');
  process.exitCode = 2;
} else {
  try {
    const draft = await draftUiScenario(requirement);
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const outputDir = path.join(root, 'generated-drafts');
    await fs.mkdir(outputDir, { recursive: true });
    const safeName = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'scenario';
    const outputPath = path.join(outputDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeName}.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    console.log(`Reviewable draft saved to ${path.relative(root, outputPath)}. It was not executed or added to the suite.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
