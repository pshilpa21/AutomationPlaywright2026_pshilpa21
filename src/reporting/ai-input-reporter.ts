import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface FailureRecord {
  title: string;
  file: string;
  status: string;
  durationMs: number;
  error?: string;
}

export default class AiInputReporter implements Reporter {
  private readonly failures: FailureRecord[] = [];
  private readonly startedAt = new Date().toISOString();
  private readonly startTime = Date.now();
  private readonly outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'artifacts/run-summary.json';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed' || result.status === 'skipped') return;
    this.failures.push({
      title: test.titlePath().join(' › '),
      file: path.relative(process.cwd(), test.location.file),
      status: result.status,
      durationMs: result.duration,
      error: result.errors.map((entry) => entry.message ?? entry.value ?? 'Unknown error').join('\n').slice(0, 4_000),
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const summary = {
      status: result.status,
      startedAt: this.startedAt,
      durationMs: Date.now() - this.startTime,
      failures: this.failures,
    };
    const outputPath = path.resolve(this.outputFile);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }
}
