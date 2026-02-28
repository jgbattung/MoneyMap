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
  // Limit to 2 workers locally to avoid overloading the Next.js dev server.
  // CI uses 1 worker explicitly.
  workers: process.env.CI ? 1 : 2,
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

    // --- Auth flow project: runs auth-flow tests WITHOUT a pre-loaded session.
    //     These tests test the sign-in / sign-up UI so they must start unauthenticated. ---
    {
      name: 'chromium-auth-flow',
      testMatch: /.*auth-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState — tests start unauthenticated
      },
      // No dependency on setup — these don't need an authenticated state
    },

    // --- Authenticated browser projects: depend on setup so auth state is ready ---
    {
      name: 'chromium',
      testIgnore: /.*auth-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: /.*auth-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: /.*auth-flow\.spec\.ts/,
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
