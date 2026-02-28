import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright E2E test configuration.
 * See https://playwright.dev/docs/test-configuration
 */

// Path to the saved authenticated browser state produced by the setup project
const AUTH_STATE_PATH = path.join(__dirname, 'e2e/.auth/user.json')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // --- Setup project: runs first, creates authenticated storage state ---
    {
      name: 'setup',
      testMatch: /.*setup-auth\.ts/,
    },

    // --- Browser projects: depend on setup so auth state is ready ---
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
