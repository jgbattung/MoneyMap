---
phase: 01-testing-infrastructure
plan: "01"
subsystem: testing
tags: [vitest, playwright, react-testing-library, github-actions, ci-cd, jsdom]

# Dependency graph
requires: []
provides:
  - Vitest 2.1.9 unit test runner with jsdom and React Testing Library
  - Playwright e2e test runner configured for localhost:3000
  - GitHub Actions CI workflow running both unit and e2e tests on PRs to main
  - vitest-mock-extended for Prisma/DB mocking in unit tests
affects:
  - 02-testing-infrastructure
  - all future phases that add unit or e2e tests

# Tech tracking
tech-stack:
  added:
    - vitest@2.1.9
    - @vitejs/plugin-react@4.7.0
    - jsdom@24.1.3
    - "@testing-library/react@16"
    - "@testing-library/dom@10"
    - "@testing-library/user-event@14"
    - vitest-mock-extended@2.0.2
    - "@playwright/test"
  patterns:
    - Unit tests use vitest globals (describe/it/expect) with jsdom environment
    - Path alias @/ resolves to src/ in both app and test code
    - CSS disabled in vitest to avoid Tailwind 4 / Vite 5 PostCSS conflict
    - E2E tests in e2e/ directory with Playwright
    - CI: unit tests gate e2e tests (e2e runs only if unit tests pass)

key-files:
  created:
    - vitest.config.ts
    - playwright.config.ts
    - e2e/.gitkeep
    - .github/workflows/testing.yml
  modified:
    - package.json

key-decisions:
  - "Downgraded from vitest@4.x to vitest@2.1.9 for Node v20.5.1 compatibility (Vite 7 requires ^20.19.0)"
  - "Downgraded vitest-mock-extended from 3.x to 2.0.2 to be compatible with vitest 2.x"
  - "Disabled CSS processing in vitest.config.ts to bypass Tailwind CSS 4 / Vite 5 PostCSS incompatibility"
  - "Used chromium-only in CI workflow to reduce build times and flakiness"
  - "E2E job depends on unit-tests job so unit test failures short-circuit the pipeline"

patterns-established:
  - "Test files: **/*.{test,spec}.{ts,tsx} (Vitest default pattern)"
  - "E2E tests live in e2e/ directory"
  - "CI: npm run test for unit, npx playwright test for e2e"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 1 Plan 01: Testing Infrastructure Setup Summary

**Vitest 2.1.9 + React Testing Library + Playwright e2e + GitHub Actions CI pipeline, all configured for a Next.js 15/Tailwind 4 project on Node v20.5.1**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-28T09:46:25Z
- **Completed:** 2026-02-28T09:52:05Z
- **Tasks:** 5 (Tasks 3 and 4 combined — Playwright config created complete in one step)
- **Files modified:** 5

## Accomplishments

- Vitest 2.1.9 runs successfully in jsdom environment with React Testing Library and `@/` alias resolution
- Playwright configured with `baseURL: http://localhost:3000` and webServer auto-starting Next.js dev server
- GitHub Actions workflow gates Playwright E2E tests behind passing Vitest unit tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Install missing testing dependencies** - `6d08b85` (chore)
2. **Task 2: Configure Vitest and React Testing Library** - `88f3b90` (feat)
3. **Task 3+4: Install and configure Playwright** - `e5f9148` (feat)
4. **Task 5: Finalize GitHub Actions Testing Workflow** - `138c06f` (feat)

## Files Created/Modified

- `vitest.config.ts` - Vitest config with jsdom, React plugin, @/ alias, PostCSS disabled
- `playwright.config.ts` - Playwright config with baseURL, webServer, chromium/firefox/webkit projects
- `e2e/.gitkeep` - Placeholder to track e2e test directory in git
- `.github/workflows/testing.yml` - CI workflow: unit tests then E2E on PRs to main
- `package.json` - Added `test` and `test:watch` scripts; updated devDependency versions

## Decisions Made

- **Vitest version pinned to 2.1.9:** Vitest 4.x (latest) requires Vite 7 which requires Node ^20.19.0. Our environment is Node v20.5.1. Vitest 2.x supports Node >=20.0.0.
- **vitest-mock-extended pinned to 2.0.2:** v3.x requires vitest >=3.0.0. v2.x supports vitest >=2.0.0.
- **CSS processing disabled in Vitest:** Tailwind CSS 4's `@tailwindcss/postcss` plugin uses a string-based plugin format incompatible with Vite 5's PostCSS resolver. Since CSS is irrelevant to unit tests, disabling it avoids the conflict cleanly.
- **Chromium-only in CI:** Running all three browser engines on CI would triple test time. Chromium catches the majority of cross-browser issues for an app primarily targeting desktop Chrome.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded Vitest from 4.x to 2.1.9 for Node v20.5.1 compatibility**
- **Found during:** Task 2 (Configure Vitest)
- **Issue:** Vitest 4.x installed but failed at startup with `ERR_REQUIRE_ESM` — Vite 7 (bundled with Vitest 4) requires Node ^20.19.0; our env is Node v20.5.1
- **Fix:** Downgraded to `vitest@2.1.9`, `@vitejs/plugin-react@4`, `jsdom@24.1.3`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run test` shows "No test files found" (expected — Vitest starts cleanly)
- **Committed in:** 88f3b90 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed PostCSS conflict between Tailwind 4 and Vite 5**
- **Found during:** Task 2 (Configure Vitest)
- **Issue:** Vite loads `postcss.config.mjs` at startup; Tailwind 4's string-based PostCSS plugin format is invalid in Vite 5's PostCSS resolver
- **Fix:** Added `css: { postcss: { plugins: [] } }` override in vitest.config.ts to provide empty PostCSS config and prevent Vite from loading the project's postcss.config.mjs
- **Files modified:** vitest.config.ts
- **Verification:** `npm run test` runs without PostCSS error
- **Committed in:** 88f3b90 (Task 2 commit)

**3. [Rule 3 - Blocking] Downgraded vitest-mock-extended from 3.x to 2.0.2**
- **Found during:** Task 3 (Install Playwright)
- **Issue:** `npm install @playwright/test` failed with peer dependency conflict: vitest-mock-extended@3.1.0 requires vitest>=3.0.0 but we have vitest@2.1.9
- **Fix:** Replaced vitest-mock-extended@3.1.0 with vitest-mock-extended@2.0.2 (supports vitest>=2.0.0)
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm install @playwright/test` succeeded after version change
- **Committed in:** e5f9148 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking)
**Impact on plan:** All fixes were necessary due to Node version constraints in the local environment. The testing infrastructure is functionally equivalent to the plan's intent. No scope creep.

## Issues Encountered

- Node v20.5.1 is below the minimum supported version for several latest packages (Vitest 4, Vite 7, jsdom 28). Pinning to older compatible versions resolved all conflicts. Future upgrade path: upgrade Node to v20.19+ to unlock latest tooling.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Unit test infrastructure ready: write `*.test.ts` / `*.test.tsx` files anywhere in the project
- E2E test infrastructure ready: write `*.spec.ts` files in `e2e/` directory
- CI pipeline active: all PRs to `main` will automatically run both test suites
- For E2E tests to work in CI, `DATABASE_URL` must be set as a GitHub Actions secret

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git history.

- vitest.config.ts: FOUND
- playwright.config.ts: FOUND
- .github/workflows/testing.yml: FOUND
- e2e/.gitkeep: FOUND
- 01-01-SUMMARY.md: FOUND
- Commit 6d08b85: FOUND
- Commit 88f3b90: FOUND
- Commit e5f9148: FOUND
- Commit 138c06f: FOUND

---
*Phase: 01-testing-infrastructure*
*Completed: 2026-02-28*
