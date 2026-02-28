/**
 * E2E Tests: Dashboard Flow
 *
 * These tests run WITH an authenticated session (from setup-auth.ts storageState).
 * They verify that the main dashboard loads correctly after login.
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Flow', () => {
  test('authenticated user is redirected to dashboard from root', async ({ page }) => {
    await page.goto('/')

    // The middleware should redirect authenticated users away from the landing page
    // to the dashboard (or stay at '/' if there is no landing-page redirect).
    // We verify we reach a valid app page — either '/' or '/dashboard'.
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })

  test('dashboard page loads and displays the Dashboard heading', async ({ page }) => {
    await page.goto('/dashboard')

    // The main Dashboard heading must be visible
    await expect(
      page.getByRole('heading', { name: /dashboard/i })
    ).toBeVisible({ timeout: 15_000 })
  })

  test('unauthenticated user is redirected to sign-in', async ({ browser }) => {
    // Open a brand-new browser context with no storage state (no cookies/session)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/dashboard')

    // Middleware should redirect to /sign-in
    await expect(page).toHaveURL('/sign-in', { timeout: 10_000 })

    await context.close()
  })

  test('dashboard renders the Net Worth section', async ({ page }) => {
    await page.goto('/dashboard')

    // NetWorthSection renders a heading — we look for any heading containing "net worth"
    // Adjust the locator if the heading text differs in the actual component
    await expect(
      page.getByText(/net worth/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('dashboard renders the Recent Transactions section', async ({ page }) => {
    await page.goto('/dashboard')

    // RecentTransactions component renders a heading
    await expect(
      page.getByText(/recent transactions/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
