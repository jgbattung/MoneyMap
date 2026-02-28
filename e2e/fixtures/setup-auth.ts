/**
 * E2E Auth Setup Fixture
 *
 * This file is run by the `setup` Playwright project before other test projects.
 * It logs in with test credentials and saves the authenticated browser state to a file,
 * so other E2E tests can reuse the session without logging in each time.
 *
 * Storage state is saved to: e2e/.auth/user.json
 * Tests that depend on auth should reference: `storageState: 'e2e/.auth/user.json'`
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

// Path where authenticated storage state will be saved
export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json')

// Test credentials — these must exist in the local database.
// Register them once with: npx ts-node scripts/seed-test-user.ts
// or manually via the Sign Up page at http://localhost:3000/sign-up
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@moneymap.dev'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPass123!'

setup('authenticate', async ({ page }) => {
  // Navigate to the sign-in page
  await page.goto('/sign-in')

  // Wait for the form to be visible
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

  // Fill in credentials
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)

  // Submit the form
  await page.getByRole('button', { name: /continue/i }).click()

  // Wait for redirect to dashboard — confirms authentication succeeded
  await page.waitForURL('/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL('/dashboard')

  // Save the authenticated storage state (cookies/localStorage)
  await page.context().storageState({ path: AUTH_STATE_PATH })
})
