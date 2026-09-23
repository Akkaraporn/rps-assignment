import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm stack:up',
    url: baseURL,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    stdout: 'ignore',
    timeout: 240_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});