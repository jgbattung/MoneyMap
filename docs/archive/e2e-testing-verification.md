# E2E Testing Infrastructure — Verification

**Spec:** `docs/e2e-testing-spec.md`
**Plan:** `docs/e2e-testing-plan.xml`
**Branch:** `feature/playwright-e2e-setup`

---

## Phase 1: Tooling and Configuration Setup

| Task | Status | Evidence |
|------|--------|----------|
| Install Playwright and Dependencies | Done | `@playwright/test` in `package.json` devDependencies; `test:e2e` and `test:e2e:ui` npm scripts added |
| Create Playwright Env and Config | Done | `playwright/.env.test` created with localhost:5433 DB URL; `playwright.config.ts` loads it via dotenv, passes env to `webServer` block |

## Phase 2: Database and Authentication Framework

| Task | Status | Evidence |
|------|--------|----------|
| Create Database Seeding Utilities | Done | `playwright/utils/db.ts` — includes localhost guardrail (aborts if DATABASE_URL is non-local), `clearDatabase()` with proper FK ordering, `seedBaseData()` for test user + types |
| Implement Global Auth Setup | Done | `playwright/global.setup.ts` — clears DB, seeds base data, creates BetterAuth session, signs cookie with HMAC-SHA256, saves browser state to `playwright/.auth/user.json` |

## Phase 3: Core Test Implementation

| Task | Status | Evidence |
|------|--------|----------|
| Implement Accounts E2E Test | Done | `tests/e2e/accounts.spec.ts` — creates checking account via UI, verifies it appears in list |
| Implement Transactions E2E Test | Done | `tests/e2e/transactions.spec.ts` — adds expense transaction, verifies it in recent transactions |
| Implement Installments Edge Case Test | Done | `tests/e2e/installments.spec.ts` — creates credit card installment, verifies parent is hidden and child installments appear |

## Phase 4: CI Pipeline Setup

| Task | Status | Evidence |
|------|--------|----------|
| Create GitHub Actions E2E Workflow | Done | `.github/workflows/e2e.yml` — postgres:15-alpine service, prisma migrate deploy, builds Next.js, runs `npm run test:e2e`, uploads Playwright report artifact |

## Post-Plan Fixes (CI stabilization)

These fixes were applied after the initial plan execution to resolve CI failures:

| Fix | File | Description |
|-----|------|-------------|
| Exclude E2E from Vitest | `vitest.config.mts` | Added `tests/e2e/**` to Vitest exclude list — Vitest was picking up Playwright test files and crashing on `test.describe()` |
| CI dotenv override | `playwright.config.ts` | Changed `.env.test` loading to `override: !process.env.CI` — prevents local port 5433 from overwriting CI's port 5432 DATABASE_URL |
| Flaky account locator | `tests/e2e/accounts.spec.ts` | Scoped `getByText('Checking')` to `page.locator('main')` — was matching 3 elements (card label, combobox value, hidden option) |

## Files Created/Modified

### New files
- `playwright.config.ts`
- `playwright/.env.test`
- `playwright/global.setup.ts`
- `playwright/utils/db.ts`
- `playwright/.auth/user.json` (generated at runtime, gitignored)
- `tests/e2e/accounts.spec.ts`
- `tests/e2e/transactions.spec.ts`
- `tests/e2e/installments.spec.ts`
- `.github/workflows/e2e.yml`

### Modified files
- `package.json` (added devDependencies + npm scripts)
- `vitest.config.mts` (excluded `tests/e2e/**`)

## Production Safety

- `playwright/utils/db.ts` aborts immediately if `DATABASE_URL` does not contain `localhost` or `127.0.0.1`
- CI uses an ephemeral Postgres container — never touches production
- Local dev uses a separate Docker Postgres on port 5433
