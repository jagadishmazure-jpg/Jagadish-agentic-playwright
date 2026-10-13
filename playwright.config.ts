import { defineConfig, devices } from '@playwright/test';
import { env } from './framework/config/env';

/**
 * One config, several projects:
 *   setup        logs in once per role and saves storageState files under .auth/ (gitignored)
 *   api          API-only tests, no browser at all
 *   chromium     the main UI suite (framework + agent-app); depends on setup
 *   firefox / webkit / mobile   the same specs tagged @cross, kept out of the default run (testProject.default: false)
 *   visual       screenshot comparisons; run inside the official Docker image so pixels match CI
 *   healing      the test-agent heal demo (a deliberately broken locator); never part of the default run
 *
 * CI: blob reporter per shard, merged afterwards into HTML + JUnit (see .github/workflows/e2e.yml).
 */
const CI = !!process.env.CI;
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Retries are a safety net, so a test that only passes on retry fails the CI run (see docs/flaky-test-playbook.md).
  failOnFlakyTests: CI,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  outputDir: 'test-results',
  reporter: CI
    ? [['blob'], ['github'], ['list']]
    : [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  webServer: env.startServer
    ? {
        command: `${python} -m uvicorn larkspur.server:app --host 127.0.0.1 --port ${new URL(env.baseURL).port} --log-level warning`,
        url: `${env.baseURL}/healthz`,
        reuseExistingServer: !CI,
        timeout: 60_000,
        env: { LARKSPUR_TEST_MODE: '1', LARKSPUR_TOKEN_DELAY_MS: process.env.LARKSPUR_TOKEN_DELAY_MS ?? '12' },
      }
    : undefined,
  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    { name: 'api', testDir: './tests/api', use: { browserName: undefined } },
    {
      name: 'chromium',
      testDir: './tests',
      testIgnore: [/api\//, /visual\//, /setup\//, /healing\//],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    { name: 'firefox', grep: /@cross/, use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'], testIgnore: [/api\//, /visual\//, /healing\//], default: false },
    { name: 'webkit', grep: /@cross/, use: { ...devices['Desktop Safari'] }, dependencies: ['setup'], testIgnore: [/api\//, /visual\//, /healing\//], default: false },
    { name: 'mobile', grep: /@mobile/, use: { ...devices['Pixel 7'] }, dependencies: ['setup'], testIgnore: [/api\//, /visual\//, /healing\//], default: false },
    { name: 'visual', testDir: './tests/visual', use: { ...devices['Desktop Chrome'] }, default: false },
    { name: 'healing', testDir: './tests/healing', use: { ...devices['Desktop Chrome'] }, default: false },
  ],
});
