# Hotfix: Sticky Header — Verification

## Summary

Two surgical fixes to correct sticky header behaviour introduced in the header-polish feature (PR #126).

---

## Task 1 — Split PageHeader sticky boundary

**File changed:** `src/components/shared/PageHeader.tsx`

### What changed

The component's return value was refactored from a single sticky `<div>` to a React Fragment (`<>...</>`):

- **Before:** One `<div className="sticky top-0 z-10 bg-background pt-6 mb-3 md:mb-5">` containing both the title row and the actions slot. Both elements pinned to the viewport on scroll.
- **After:**
  - A sticky `<div className="sticky top-0 z-10 bg-background pt-6">` wrapping only the title row (h1 + UserMenu). The `mb-3 md:mb-5` bottom margin was removed from this div.
  - The actions slot is now rendered outside the sticky div as a non-sticky element with `className="flex justify-end mt-4 mb-3 md:mb-5"`. It scrolls normally with page content.
  - When no `actions` prop is provided, a spacer `<div className="mb-3 md:mb-5" />` preserves the original bottom spacing that was previously on the sticky wrapper.

The `PageHeaderProps` interface (`title: string; actions?: React.ReactNode`) is unchanged.

---

## Task 2 — Remove wrapper div on Transactions page

**File changed:** `src/app/transactions/page.tsx`

### What changed

- **Before:** `PageHeader` was wrapped in `<div className="mb-6">`, which made it the containing block for `position: sticky`. Because the containing block was exactly the height of the header, the sticky element had zero scroll distance and scrolled away with the page.
- **After:** The wrapper `<div>` was removed. `PageHeader` is now a direct child of the outer page container, matching the pattern used by Dashboard, Accounts, Cards, and all other pages.

---

## Verification

### Automated checks

| Check | Result |
|-------|--------|
| `npm run lint` | PASS — zero errors |
| `npm run build` | PASS — zero errors, 20/20 static pages generated |

### Manual checks (to be performed in browser)

| Page | Expected behaviour |
|------|--------------------|
| Transactions | PageHeader title row sticks to top on scroll |
| Accounts | Title row sticks; Add Account button scrolls away with content |
| Cards | Title row sticks; Add Credit Card button scrolls away with content |
| Dashboard | PageHeader sticks correctly (no actions — regression check) |

---

## Files Changed

- `src/components/shared/PageHeader.tsx`
- `src/app/transactions/page.tsx`

## Files NOT Changed

All other consumer pages (Dashboard, Accounts, Cards, Budgets, Expenses, Income, Transfers, Reports, Settings, More) required no changes — the `PageHeaderProps` interface is identical.

---

## QA Results

**QA Pipeline run:** 2026-03-22
**Status:** PASS

### Test Files Generated / Updated

| File | Tests | Notes |
|------|-------|-------|
| `src/components/shared/PageHeader.test.tsx` | 27 tests | Updated: replaced stale `mb-3 on sticky wrapper` test; added 8 new tests covering spacer div, actions-outside-sticky, and hotfix class invariants |
| `src/app/transactions/page.test.tsx` | 9 tests | New file: covers heading render, UserMenu presence, no-wrapper-div invariant (Task 2), no actions slot, spacer div, mobile/desktop view render, layout classes |

### Vitest Results

| Run | Files | Tests | Failures |
|-----|-------|-------|----------|
| `PageHeader.test.tsx` (isolated) | 1 passed | 27 passed | 0 |
| `page.test.tsx` (isolated) | 1 passed | 9 passed | 0 |
| Full suite (`npx vitest run`) | 66 passed | 1052 passed | 0 |

### Lint

`npm run lint --max-warnings=0` — zero warnings or errors.

### Fixes Applied

- `src/components/shared/PageHeader.test.tsx` — Removed test asserting `mb-3` on the sticky wrapper (stale after hotfix moved the margin outside); replaced with a test asserting the sticky wrapper does NOT have `mb-3`. Added spacer-div tests, actions-outside-sticky test, and title/UserMenu-inside-sticky tests to cover the new Fragment structure.
- `src/app/transactions/page.test.tsx` — New file created; no source changes required.

### Source Fixes

None — all failures were Category A (stale test assertion). No source code bugs found.

---

## QA Results (re-run)

**QA Pipeline re-run:** 2026-03-22
**Trigger:** Spacing tweaks to `PageHeader.tsx` made after the previous QA run.
**Status:** PASS

### What Changed in the Source

The actions row class changed from `flex justify-end mt-4 mb-3 md:mb-5` to `flex justify-end mt-4 md:mb-5` — `mb-3` was removed from the actions row. The spacer div (`mb-3 md:mb-5`) is still rendered only in the `!actions` branch. All other classes (sticky wrapper, inner row, h1, spacer) are unchanged.

### Test File Updated

| File | Tests | Change |
|------|-------|--------|
| `src/components/shared/PageHeader.test.tsx` | 27 tests | Fixed 1 stale assertion: "does NOT render the spacer when actions are provided" expected `allMb3.length` to be `1` (old: actions row had `mb-3`); updated to `0` (new: actions row uses `mt-4 md:mb-5`, no `mb-3`). Updated comment to match. |

### Vitest Results

| Run | Files | Tests | Failures |
|-----|-------|-------|----------|
| `PageHeader.test.tsx` (isolated) | 1 passed | 27 passed | 0 |
| Full suite (`npx vitest run`) | 66 passed | 1052 passed | 0 |

### Lint

`npm run lint --max-warnings=0` — zero warnings or errors.

### Fixes Applied

- `src/components/shared/PageHeader.test.tsx` — Updated assertion in "does NOT render the spacer when actions are provided": `expect(allMb3.length).toBe(1)` → `toBe(0)`. Updated inline comment to reflect that the actions row no longer carries `mb-3`.

### Source Fixes

None — Category A failure (stale test assertion reflecting old class names). No source code bugs found.
