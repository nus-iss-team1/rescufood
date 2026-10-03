import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { requireEnv } from './tests/helpers/env';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Pinned everywhere, not just CI: RequestsPage.mostRecentActiveRequest()
  // (used because /requests can't resolve a listing's description for a
  // rescue partner's own *active* claim - a backend bug, see its comment)
  // relies on "the newest request" being unambiguous, which only holds if
  // requests aren't being filed concurrently by another worker. Once that
  // bug is fixed and RequestsPage goes back to matching by tag/description
  // instead, this can revert to `process.env.CI ? 1 : undefined`.
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
