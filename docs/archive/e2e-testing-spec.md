# E2E Testing Infrastructure Specification

## Goal
Establish a robust, reliable, and isolated end-to-end (E2E) testing infrastructure for Money Map using Playwright, Prisma, and GitHub Actions. This infrastructure will allow us to confidently test core user flows (accounts, transactions, installments) without risking production data or wrestling with flaky UI-based authentication flows.

## Proposed Changes

### Core Infrastructure
- **Playwright Setup**: Install `@playwright/test` and configure `playwright.config.ts`. The config will use the local Next.js dev server (`http://localhost:3000`) for local runs and the production build for CI runs.
- **Environment Isolation**: Tests will run exclusively against the local `money_map_dev` Docker database. A dedicated `playwright/.env.test` file must be created containing the local `DATABASE_URL`. `playwright.config.ts` must use the `dotenv` package to load this file *before* defining the config, and explicitly pass these environment variables into the `webServer` block so the Next.js app connects safely.

### Authentication Strategy
- **Global Setup**: A `playwright.global.setup.ts` file will run once before all tests. It will use Prisma to directly insert a "Test User" and a valid BetterAuth `Session` record into the database.
- **State Storage**: The setup script will mock the BetterAuth session cookie and save the browser context state to `playwright/.auth/user.json`.
- **Test Context**: All E2E tests will be configured to use this generic signed-in state, completely bypassing the Google OAuth and email/password UI flow. This makes tests vastly faster and more reliable.

### Database Seeding Strategy
- **Fixture approach**: A `playwright/fixtures.ts` or utility file will provide helpers to `resetDatabase()` and `seedBaseData()`.
- **Isolation Level**: The database should be reset (via Prisma `deleteMany` operations) and re-seeded *per test file* (in `test.beforeAll`) rather than per individual test, striking a balance between test isolation and execution speed.

### Initial Test Suites
Playwright tests should be placed in `tests/e2e/`.

1. **`accounts.spec.ts`**: Testing the creation of financial accounts and verifying their appearance in the dashboard/list views.
2. **`transactions.spec.ts`**: Testing the addition of standard expense and income transactions, ensuring table counts update correctly.
3. **`installments.spec.ts`**: Testing the complex credit card installment logic. Must verify that the *parent* transaction is hidden from lists, and only the generated child installments appear on their respective start dates.

### CI/CD Integration
- **GitHub Actions**: Create `.github/workflows/e2e.yml`.
- **Services**: Define a Postgres service container within the job.
- **Workflow**:
  1. Start Postgres service.
  2. Install dependencies (`npm ci`).
  3. Run `npx prisma migrate deploy` against the CI database.
  4. Build the Next.js app (`npm run build`).
  5. Run Playwright tests using `npm run start` as the webServer.
  6. Upload Playwright HTML reports on failure.

---

## Handoff Note for Builder

**Feature:** Playwright E2E Infrastructure
**Branch name suggestion:** `feature/playwright-e2e-setup`

**Files most likely to be affected:**
- `package.json`
- `playwright.config.ts` [NEW]
- `playwright/global.setup.ts` [NEW]
- `playwright/utils/db.ts` [NEW]
- `tests/e2e/**/*.spec.ts` [NEW]
- `.github/workflows/e2e.yml` [NEW]

**Watch out for:**
- **BetterAuth Integration**: BetterAuth session cookies are typically named `better-auth.session_token`. You will need to inspect the Next.js request headers or BetterAuth source to ensure you mock the cookie name and value correctly in the global setup script so the middleware accepts it.
- **Prisma Client Issues**: Ensure that the Prisma client used in the Playwright setup scripts connects to the test database, not production.
- **Component Availability**: Some UI components (like Modals/Drawers) might take time to animate in. Leverage Playwright's auto-waiting and locators carefully (e.g., `getByRole('dialog')` rather than generic CSS selectors).

**Verification focus:**
- Run the tests locally yourself first seamlessly. If the tests pass, the setup works.
- Push the branch and ensure the GitHub Actions CI E2E workflow spins up the database and passes.
