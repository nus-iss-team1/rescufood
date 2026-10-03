import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { requireEnv } from './tests/helpers/env';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serialised: concurrent groups multiply reads against the listings service rate limit.
  workers: 1,
  reporter: process.env.CI
    ? [
        ['html'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github'],
      ]
    : 'html',
  use: {
    baseURL: requireEnv('BASE_URL'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
