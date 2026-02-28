/**
 * E2E Tests: Auth Flows (Sign-Up and Sign-In)
 *
 * These tests run WITHOUT a pre-authenticated state (no storageState override)
 * because we are testing the auth UI itself.
 *
 * NOTE: These tests use a `setup` project dependency-free approach — they are
 * declared with `use: { storageState: undefined }` so they always start unauthenticated.
 */

import { test, expect } from '@playwright/test'

// This spec file runs under the `chromium-auth-flow` project which has NO storageState,
// so all tests start unauthenticated. No test.use() override needed here.

/**
 * Helper: generate a unique email to avoid conflicts between test runs
 */
function uniqueEmail(): string {
  return `testuser+${Date.now()}@moneymap.dev`
}

test.describe('Sign-In Flow', () => {
  test('sign-in page renders correctly', async ({ page }) => {
    await page.goto('/sign-in')

    // Heading is visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    // Email input is present
    await expect(page.getByLabel('Email')).toBeVisible()

    // Password input is present
    await expect(page.getByLabel('Password')).toBeVisible()

    // Submit button is present
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()

    // Link to sign-up page is present
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible()
  })

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')

    // Wait for full page load including React hydration
    await page.waitForLoadState('networkidle')

    // Wait for the form to be fully loaded and interactive
    const emailInput = page.locator('#email')
    const pwdInput = page.locator('#pwd')
    await expect(emailInput).toBeVisible({ timeout: 15_000 })
    await expect(emailInput).toBeEnabled()

    // Fill values — retry once if hydration clears the values
    for (let attempt = 0; attempt < 3; attempt++) {
      await emailInput.click()
      await emailInput.fill('')
      await emailInput.pressSequentially('nonexistent@example.com')
      await pwdInput.click()
      await pwdInput.fill('')
      await pwdInput.pressSequentially('wrongpassword123')

      const emailVal = await emailInput.inputValue()
      if (emailVal === 'nonexistent@example.com') break

      // Value was cleared by hydration — wait a bit and retry
      await page.waitForTimeout(500)
    }

    // Verify values were entered successfully
    await expect(emailInput).toHaveValue('nonexistent@example.com')

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for loading to clear (button shows "Signing in" then returns to "Continue")
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 20_000 })

    // An error div should appear with class containing "text-error"
    await expect(page.locator('[class*="text-error"]')).toBeVisible({ timeout: 15_000 })
  })

  test('navigates to sign-up page via the create account link', async ({ page }) => {
    await page.goto('/sign-in')
    // Wait for the page to be fully ready
    await page.waitForLoadState('networkidle')
    // Click the "Create account" link at the bottom of the sign-in form
    await Promise.all([
      page.waitForURL('**/sign-up', { timeout: 30_000 }),
      page.locator('a[href="/sign-up"]').click(),
    ])
    await expect(page).toHaveURL(/\/sign-up/)
  })
})

test.describe('Sign-Up Flow', () => {
  test('sign-up page renders correctly', async ({ page }) => {
    await page.goto('/sign-up')

    // Heading is visible
    await expect(
      page.getByRole('heading', { name: /create a moneymap account/i })
    ).toBeVisible()

    // First name and last name inputs
    await expect(page.getByLabel('Firstname')).toBeVisible()
    await expect(page.getByLabel('Lastname')).toBeVisible()

    // Email and password inputs
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()

    // Submit button
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()

    // Link back to sign-in
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('shows an error when trying to sign up with a password that is too short', async ({
    page,
  }) => {
    await page.goto('/sign-up')

    // Wait for full page load including React hydration
    await page.waitForLoadState('networkidle')

    // Wait for the form to be fully loaded
    const firstnameInput = page.getByLabel('Firstname')
    await expect(firstnameInput).toBeVisible({ timeout: 15_000 })
    await expect(firstnameInput).toBeEnabled()

    // Fill the form using pressSequentially (more reliable with React hydration)
    await firstnameInput.click()
    await firstnameInput.pressSequentially('Test')
    await page.getByLabel('Lastname').click()
    await page.getByLabel('Lastname').pressSequentially('User')
    const emailVal = uniqueEmail()
    await page.getByLabel('Email').click()
    await page.getByLabel('Email').pressSequentially(emailVal)
    await page.getByLabel('Password').click()
    await page.getByLabel('Password').pressSequentially('short') // < 8 characters

    // Verify values are entered
    await expect(page.getByLabel('Email')).toHaveValue(emailVal)

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for loading state to clear
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 15_000 })

    // An error message about password length should appear
    const errorMessage = page.locator('[class*="text-error"]')
    await expect(errorMessage).toBeVisible({ timeout: 10_000 })
    await expect(errorMessage).toContainText(/password/i)
  })

  test('shows an error when trying to sign up with an already registered email', async ({
    page,
  }) => {
    // Use the known test account (set up by setup-auth.ts)
    const existingEmail = process.env.E2E_TEST_EMAIL ?? 'test@moneymap.dev'

    await page.goto('/sign-up')

    // Wait for full page load including React hydration
    await page.waitForLoadState('networkidle')

    // Wait for the form to be fully loaded
    const firstnameInput = page.getByLabel('Firstname')
    await expect(firstnameInput).toBeVisible({ timeout: 15_000 })
    await expect(firstnameInput).toBeEnabled()

    // Fill the form using pressSequentially (more reliable with React hydration)
    await firstnameInput.click()
    await firstnameInput.pressSequentially('Test')
    await page.getByLabel('Lastname').click()
    await page.getByLabel('Lastname').pressSequentially('User')
    await page.getByLabel('Email').click()
    await page.getByLabel('Email').pressSequentially(existingEmail)
    await page.getByLabel('Password').click()
    await page.getByLabel('Password').pressSequentially('TestPass123!')

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for loading state to clear
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 15_000 })

    // An error about duplicate email should appear
    await expect(page.locator('[class*="text-error"]')).toBeVisible({ timeout: 10_000 })
  })

  test('navigates to sign-in page via the sign-in link', async ({ page }) => {
    await page.goto('/sign-up')
    // Wait for the page to be fully ready
    await page.waitForLoadState('networkidle')
    // Click the "Sign In" link at the bottom of the sign-up form
    await Promise.all([
      page.waitForURL('**/sign-in', { timeout: 30_000 }),
      page.locator('a[href="/sign-in"]').click(),
    ])
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
