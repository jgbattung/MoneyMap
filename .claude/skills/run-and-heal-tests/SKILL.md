---
name: run-and-heal-tests
description: Executes Vitest (unit/component) and Playwright (E2E) test suites, then self-heals any failures by analyzing stack traces and fixing broken test code or underlying source code until the suite is green. Use when user asks to "run tests", "fix tests", or says "/run-and-heal-tests". Also triggers automatically after the generate-tests skill completes.
---

# run-and-heal-tests

You are the **QA runner and healer** for Money Map. Your job is to execute tests, read the output, and iteratively fix failures until the entire suite passes. You operate in a loop: **run → analyze → fix → repeat** until green.

---

## Step 1 — Identify What to Run

Before running anything, determine the scope:

| User intent | What to run |
|---|---|
| "Run all tests" | All Vitest unit/component tests + all Playwright E2E specs |
| "Run tests for `Foo`" | Only the matching Vitest file (co-located test) |
| "Run E2E tests" | Only Playwright |
| After `generate-tests` | Run the specific file(s) just written |

If scope is ambiguous, **default to running the file most recently written or discussed** rather than the full suite.

---

## Step 2 — Run Commands

### Vitest (Unit / Component)

```bash
# Run all unit/component tests
npm run test

# Run a specific test file
npm run test -- src/components/foo/Bar.test.tsx

# Run tests matching a pattern
npm run test -- --testPathPattern="Budget"

# Run in watch mode (use only if user explicitly asks)
npm run test -- --watch
```

### Playwright (E2E)

```bash
# Run all E2E specs
npx playwright test

# Run a specific spec file
npx playwright test e2e/budget-flow.spec.ts

# Run with UI (use only if user explicitly asks)
npx playwright test --ui

# Run in headed mode for debugging
npx playwright test --headed
```

**Important:** Always use the Bash tool to run these commands. Capture both stdout and stderr — failure details are in stderr.

---

## Step 3 — Analyze Failures

After each run, carefully read the full output. Classify each failure into one of these categories before attempting a fix:

### Category A — Test Code Error
The test itself is wrong (bad mock setup, incorrect selector, wrong assertion). The source code is fine.

Signs:
- `Expected: ... Received: ...` with clearly wrong expectation
- `Unable to find role "button"` — selector mismatch
- `Cannot read properties of undefined` inside a mock — mock not set up correctly
- `vi.fn is not a function` — missing mock import
- Type error in the test file itself

**Fix: edit the test file.**

### Category B — Source Code Bug
The test logic is correct but the component/route/hook has a genuine bug.

Signs:
- The test describes the intended behavior clearly (e.g., "should return 401 when unauthenticated")
- The source code path being tested doesn't implement that behavior
- The failure makes semantic sense as a real bug report

**Fix: edit the source file, NOT the test.**

### Category C — Environment / Setup Issue
Missing package, missing fixture, wrong config, Prisma client not generated.

Signs:
- `Cannot find module 'vitest-mock-extended'`
- `Cannot find module '@/lib/prisma'`
- `Error: browserType.launch: Executable doesn't exist` (Playwright browsers not installed)
- `PrismaClientInitializationError`

**Fix: resolve the environment issue first** (install package, generate client, install browsers), then re-run.

---

## Step 4 — Fix Decision Tree

```
Test failure detected
       │
       ▼
Is it a missing dependency / env issue? ──YES──► Fix environment (npm install, npx prisma generate, npx playwright install), then re-run
       │
       NO
       ▼
Is the test assertion/selector/mock wrong? ──YES──► Fix the test file (Category A)
       │
       NO
       ▼
Does the test correctly describe intended behavior? ──YES──► Fix the source file (Category B)
       │
       NO
       ▼
Ask the user to clarify intent before changing anything
```

**Never delete a failing test to make the suite pass.** If a test cannot be made to pass, flag it clearly and explain why.

---

## Step 5 — Common Fix Patterns

### Fix: Wrong RTL Selector

```typescript
// Bad — brittle text match
screen.getByText('Submit')

// Good — semantic role
screen.getByRole('button', { name: /submit/i })

// Good — label association
screen.getByLabelText(/email address/i)

// Good — test id (last resort)
screen.getByTestId('submit-btn')
```

### Fix: Mock Not Reset Between Tests

```typescript
// Add to beforeEach if state leaks between tests
beforeEach(() => {
  vi.clearAllMocks()
  mockReset(prismaMock)
})
```

### Fix: Async Assertion Missing `waitFor`

```typescript
// Bad — assertion fires before async update
expect(screen.getByText('Saved')).toBeInTheDocument()

// Good
await waitFor(() => {
  expect(screen.getByText('Saved')).toBeInTheDocument()
})
```

### Fix: Better Auth Mock Not Applied

```typescript
// Ensure vi.mock is at the TOP of the file, before any imports that use it
vi.mock('better-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'u1', name: 'Test', email: 'test@example.com' } },
    isPending: false,
    error: null,
  })),
}))
```

### Fix: Prisma Mock Returning Wrong Shape

Check the Prisma schema for the exact shape of the model, then update the mock return value to match all required fields.

### Fix: Playwright Auth State Missing

```bash
# Generate auth state by running the setup script (create if missing)
npx playwright test e2e/fixtures/setup-auth.ts --project=setup
```

If no setup script exists, create `e2e/fixtures/setup-auth.ts` that logs in via the UI and saves `context.storageState()` to `e2e/fixtures/auth-state.json`.

---

## Step 6 — The Healing Loop

Repeat this loop until the suite is green or a blocker is identified:

```
1. Run the relevant test command (Step 2)
2. If PASS → done, report results to user
3. If FAIL → classify each failure (Step 3)
4. Apply the fix (Step 4 + Step 5)
5. Re-run only the failing file(s) to verify the fix
6. If still failing → re-analyze (do not re-apply the same fix twice)
7. After all individual files pass → run the full suite once to confirm no regressions
8. Report final status to user
```

**Maximum healing attempts per test:** 3. If a test still fails after 3 targeted attempts, stop and report the failure with a clear explanation and recommended next steps. Do not loop forever.

---

## Step 7 — Final Report

When the loop completes, report to the user:

```
## Test Results

**Status:** PASS / FAIL

**Vitest:** X passed, Y failed
**Playwright:** X passed, Y failed

### Fixed
- `src/components/foo/Bar.test.tsx` — fixed incorrect role selector on line 24
- `src/hooks/useBar.test.ts` — updated Prisma mock to include required `createdAt` field

### Source Fixes Applied
- `src/components/foo/Bar.tsx` — fixed missing null check that caused crash when user is unauthenticated

### Still Failing (if any)
- `e2e/checkout-flow.spec.ts` — Playwright auth state missing. Run setup script first.
```
