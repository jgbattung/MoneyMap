/**
 * E2E Auth Setup Fixture
 *
 * This file is run by the `setup` Playwright project before other test projects.
 * It authenticates via the Better Auth REST API directly and saves the session cookie
 * to the browser context's storage state.
 *
 * Storage state is saved to: e2e/.auth/user.json
 * Tests that depend on auth should use: `storageState: 'e2e/.auth/user.json'`
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Path where authenticated storage state will be saved
export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json')

// Test credentials — these must exist in the local database.
// Register them once with: node scripts/seed-test-user.mjs
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@moneymap.dev'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPass123!'
const BASE_URL = 'http://localhost:3000'

setup('authenticate', async ({ page, context }) => {
  // Step 1: Sign in via the Better Auth REST API to get the session cookie.
  // page.request shares the browser context's storage (including cookies).
  const signInResponse = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rememberMe: true,
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  expect(
    signInResponse.ok(),
    `Sign-in failed with status ${signInResponse.status()}`
  ).toBeTruthy()

  const signInData = await signInResponse.json()
  expect(signInData.token, 'No token returned from sign-in').toBeTruthy()

  // Step 2: Ensure the .auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Step 3: Save the browser context's storage state.
  // page.request.post() automatically stores the Set-Cookie response header in
  // the browser context's cookie jar, so the session cookie is already there.
  await context.storageState({ path: AUTH_STATE_PATH })

  // Step 4: Verify the saved state includes the session cookie
  const savedState = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'))
  const hasSessionCookie = savedState.cookies?.some(
    (c: { name: string }) => c.name.includes('session')
  )

  expect(hasSessionCookie, 'Session cookie was not saved to storage state').toBeTruthy()
})
