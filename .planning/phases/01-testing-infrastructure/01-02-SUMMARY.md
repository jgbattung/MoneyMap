---
phase: 01-testing-infrastructure
plan: "02"
subsystem: testing
tags: [vitest, playwright, react-testing-library, e2e, unit-tests, better-auth]

# Dependency graph
requires:
  - phase: 01-testing-infrastructure plan 01
    provides: Vitest + Playwright infrastructure, jsdom environment, path aliases, CI workflow
provides:
  - Vitest unit tests for useNetWorth and useRecentTransactions hooks
  - Vitest unit tests for src/lib/utils utilities
  - Playwright E2E auth fixture with storageState for authenticated test sessions
  - Playwright E2E specs for Sign-In and Sign-Up flows (7 tests, all green)
  - Playwright E2E spec for authenticated dashboard flow
affects: all future phases — test patterns established here should be followed

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vitest-mock-extended for Prisma mocking
    - Better Auth useSession mock via vi.mock('better-auth/react')
    - Playwright storageState fixture for authenticated E2E sessions
    - chromium-auth-flow project for unauthenticated auth UI tests
    - Sequential click + waitForURL for Next.js client-side navigation assertions

key-files:
  created:
    - src/hooks/useNetWorth.test.ts
    - src/hooks/useRecentTransactions.test.ts
    - src/lib/utils.test.ts
    - e2e/auth-flow.spec.ts
    - e2e/dashboard-flow.spec.ts
    - e2e/fixtures/setup-auth.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "Do NOT test Shadcn/ui components in src/components/ui/ — they are pre-built primitives"
  - "chromium-auth-flow Playwright project runs auth-flow.spec.ts with no storageState (unauthenticated)"
  - "Sequential click() then waitForURL() is more reliable than Promise.all for Next.js routing on sign-up page"
  - "setup-auth.ts fixture saves authenticated storageState for downstream E2E tests"

patterns-established:
  - "Auth mock pattern: vi.mock('better-auth/react') with useSession returning test user shape"
  - "Prisma mock pattern: mockDeep<PrismaClient>() + vi.mock('@/lib/prisma') + beforeEach mockReset"
  - "E2E navigation: await click() then await waitForURL() — not Promise.all"
  - "Test scope: hooks + lib utils + app components only; never src/components/ui/"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-02-28
---

# Plan 01-02: Foundational Test Writing Summary

**Vitest unit tests for custom hooks and utilities + Playwright E2E auth/dashboard specs, all green with storageState fixture**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-02-28
- **Completed:** 2026-02-28
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Vitest unit tests written for `useNetWorth`, `useRecentTransactions` hooks and `src/lib/utils`
- Playwright E2E `auth-flow.spec.ts` with 7 tests covering Sign-In and Sign-Up flows (render, error states, navigation) — all passing
- Playwright E2E `dashboard-flow.spec.ts` for authenticated dashboard load
- `e2e/fixtures/setup-auth.ts` fixture that logs in via the UI and saves `storageState` for authenticated test sessions
- Playwright config updated with `chromium-auth-flow` project (no storageState) and `setup` project dependency chain

## Task Commits

1. **Task 1: Vitest unit/component tests** — `1f38491` (feat)
2. **Task 2: E2E auth fixture + Playwright config** — `9241832` (feat)
3. **Task 3: Foundational E2E specs (auth + dashboard)** — `313ae84` (feat)
4. **Heal: fix sign-up→sign-in navigation test** — `4fe931a` (fix)

## Files Created/Modified

- `src/hooks/useNetWorth.test.ts` — Vitest tests for net worth calculation hook
- `src/hooks/useRecentTransactions.test.ts` — Vitest tests for recent transactions hook
- `src/lib/utils.test.ts` — Vitest tests for utility functions (cn, formatters)
- `e2e/auth-flow.spec.ts` — 7 Playwright tests: sign-in render, error on invalid creds, navigation; sign-up render, short password error, duplicate email error, navigation
- `e2e/dashboard-flow.spec.ts` — Playwright test for authenticated dashboard load
- `e2e/fixtures/setup-auth.ts` — Playwright setup fixture saving authenticated storageState
- `playwright.config.ts` — Added `chromium-auth-flow` project (no storageState), `setup` project, and authenticated projects with storageState dependency

## Decisions Made

- **No tests for `src/components/ui/`**: Shadcn/ui components are pre-built primitives — testing them adds noise without value. User explicitly requested this constraint.
- **`chromium-auth-flow` Playwright project**: Auth flow tests must run unauthenticated (they test the auth UI itself), so a separate project with no `storageState` was created.
- **Sequential navigation in tests**: `click()` then `waitForURL()` is more reliable than `Promise.all([waitForURL, click])` for Next.js client-side routing on pages with forms.

## Deviations from Plan

### Auto-fixed Issues

**1. [Category A — Test Code] Sign-up→sign-in navigation test using unreliable Promise.all**
- **Found during:** Task 3 heal loop (E2E test run)
- **Issue:** `Promise.all([page.waitForURL(), click()])` timed out on sign-up page while the identical pattern worked on sign-in page
- **Fix:** Changed to sequential `await click()` then `await waitForURL()`
- **Files modified:** `e2e/auth-flow.spec.ts`
- **Verification:** All 7 auth-flow tests pass
- **Committed in:** `4fe931a`

---

**Total deviations:** 1 auto-fixed (Category A test code issue)
**Impact on plan:** No scope creep. Fix was a test reliability improvement only.

## Issues Encountered

- Shadcn/ui test files (`button.test.tsx`, `input.test.tsx`) were generated before the constraint was clarified — deleted before committing.

## User Setup Required

None — no external service configuration required beyond the `DATABASE_URL` already noted in phase 01-01 blockers.

## Next Phase Readiness

- Test infrastructure is complete and green
- All future features can use the established mock patterns for Better Auth and Prisma
- CI pipeline will run Vitest then Playwright on every PR to main
- `e2e/.auth/user.json` storageState file must exist locally before running authenticated E2E tests (generated by `npx playwright test --project=setup`)

---
*Phase: 01-testing-infrastructure*
*Completed: 2026-02-28*
