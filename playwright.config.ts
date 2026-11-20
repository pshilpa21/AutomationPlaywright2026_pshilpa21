import 'dotenv/config';
import os from 'node:os';
import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${process.env.JUICE_SHOP_PORT ?? '3001'}`;
const workers = Number(process.env.PLAYWRIGHT_WORKERS ?? 2);

if (!Number.isSafeInteger(workers) || workers < 1) {
  throw new Error('PLAYWRIGHT_WORKERS must be a positive whole number.');
}

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          target: 'OWASP Juice Shop (local training app)',
          base_url: baseURL,
          os_platform: os.platform(),
          os_release: os.release(),
          node_version: process.version,
        },
      },
    ],
    ['./src/reporting/ai-input-reporter.ts', { outputFile: 'artifacts/run-summary.json' }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-ui',
      testMatch: '**/ui/**/*.spec.ts',
      use: { browserName: 'chromium' },
    },
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: {},
    },
    {
      name: 'accessibility',
      testMatch: '**/accessibility/**/*.spec.ts',
      use: { browserName: 'chromium', headless: true },
    },
    {
      name: 'compat-chromium-desktop',
      testMatch: '**/compatibility/**/*.spec.ts',
      use: { browserName: 'chromium', viewport: { width: 1365, height: 768 } },
    },
    {
      name: 'compat-firefox-desktop',
      testMatch: '**/compatibility/**/*.spec.ts',
      use: { browserName: 'firefox', viewport: { width: 1365, height: 768 } },
    },
    {
      name: 'compat-webkit-desktop',
      testMatch: '**/compatibility/**/*.spec.ts',
      use: { browserName: 'webkit', viewport: { width: 1365, height: 768 } },
    },
    {
      name: 'compat-chromium-mobile',
      testMatch: '**/compatibility/**/*.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
