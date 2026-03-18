# search-tags-cleanup — Verification

## Status
All 18 tasks completed and committed.

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Remove tagIds from useExpenseTransactionsQuery | e062eda | ✓ Done |
| 2 | Remove tagIds from useIncomeTransactionsQuery | c64c767 | ✓ Done |
| 3 | Remove tagIds from useTransferTransactionsQuery | e6d5845 | ✓ Done |
| 4 | Remove tagIds GET filtering from expense-transactions API | dab02af | ✓ Done |
| 5 | Remove tagIds GET filtering from income-transactions API | c17cd11 | ✓ Done |
| 6 | Remove tagIds GET filtering from transfer-transactions API | ac95237 | ✓ Done |
| 7 | Remove TagFilter from ExpenseTable | 621b7a0 | ✓ Done |
| 8 | Remove TagFilter from IncomeTable | 4e8d3b5 | ✓ Done |
| 9 | Remove TagFilter from TransferTable | 1cedc3a | ✓ Done |
| 10 | Remove TagFilter from TransactionsMobileView | 90edef2 | ✓ Done |
| 11 | Remove TagFilter from expenses page | 4959bd1 | ✓ Done |
| 12 | Remove TagFilter from income page | 4f6d008 | ✓ Done |
| 13 | Remove TagFilter from transfers page | e203b58 | ✓ Done |
| 14 | Remove TagFilter mock + tests from ExpenseTable.test.tsx | 18b8def | ✓ Done |
| 15 | Remove TagFilter mock + tests from IncomeTable.test.tsx | 780c4e5 | ✓ Done |
| 16 | Remove TagFilter mock + tests from TransferTable.test.tsx | a1c3f98 | ✓ Done |
| 17 | Remove TagFilter mock + tests from TransactionsMobileView.test.tsx | e97679f | ✓ Done |
| 18 | Delete TagFilter.tsx and TagFilter.test.tsx | 39b44bc | ✓ Done |

## Verification Steps

### Tests
```
npx vitest run src/
```
Result: **47 test files, 740 tests — all passed**

### Lint
```
npm run lint
```
Result: **✔ No ESLint warnings or errors**

### Build
```
npm run build
```
Result: **Zero errors. All routes compile cleanly.**

### No TagFilter references remaining
```
grep -r "TagFilter" src/ --include="*.tsx" --include="*.ts" -l
```
Result: **No matches** — TagFilter is fully removed from the codebase.

## What Was Removed

- **`src/components/shared/TagFilter.tsx`** — the component itself
- **`src/components/shared/TagFilter.test.tsx`** — its dedicated tests
- **`tagIds` query param** from all three GET API routes (expense, income, transfer transactions)
- **`tagIds` option** from all three custom hooks (`useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useTransferTransactionsQuery`)
- **TagFilter UI + state** from all three desktop tables and the unified mobile view
- **TagFilter UI + state** from all three page-level components (`/expenses`, `/income`, `/transfers`)
- **TagFilter mocks + test blocks** from all four test files

## What Was Kept

- Tag-name text search via the unified search bar (wired through existing `search` param in hooks and API routes — unchanged)
- `tagIds` in Zod schemas and POST/PATCH handlers — creating/updating transactions with tags still works
- `useTagsQuery` imports in table files — still used by `TagsCell` for inline tag editing
- All other search and filter functionality (search term, date filter, account filter)

## Notes

- This was a pure removal. No new behavior was introduced.
- The `isFiltering` flags on all pages were updated to exclude the removed `tagIds` check.
- 15 previously-failing tag-filter client-side tests in the desktop table test files were removed as part of Phase 5 (they tested the now-deleted functionality).

---

## QA Results

**QA Pipeline run:** 2026-03-18
**Status:** PASS

### Test Files Generated

| File | Test Cases |
|------|-----------|
| `src/hooks/useExpenseTransactionsQuery.test.ts` | 10 (generated — was missing) |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | 10 (generated — was missing) |

All other test files listed in scope already existed and were verified.

### Vitest Results (full suite smoke check)

**49 test files, 760 tests — all passed, 0 failures**

Breakdown by target scope:

| Test File | Tests | Result |
|-----------|-------|--------|
| `src/hooks/useExpenseTransactionsQuery.test.ts` | 10 | PASS |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | 10 | PASS |
| `src/hooks/useTransferTransactionsQuery.test.ts` | 9 | PASS |
| `src/app/api/expense-transactions/route.test.ts` | 17 | PASS |
| `src/app/api/income-transactions/route.test.ts` | 19 | PASS |
| `src/app/api/transfer-transactions/route.test.ts` | 19 | PASS |
| `src/components/tables/expenses/ExpenseTable.test.tsx` | 12 | PASS |
| `src/components/tables/income/IncomeTable.test.tsx` | 13 | PASS |
| `src/components/tables/transfers/TransferTable.test.tsx` | 13 | PASS |
| `src/components/transactions/TransactionsMobileView.test.tsx` | 6 | PASS |

### Fixes Applied

- `src/hooks/useExpenseTransactionsQuery.test.ts` — file created (was missing from codebase despite being listed as a target); added `/* eslint-disable react/display-name */` to fix lint error on wrapper factory
- `src/hooks/useIncomeTransactionsQuery.test.ts` — file created (was missing from codebase despite being listed as a target); added `/* eslint-disable react/display-name */` to fix lint error on wrapper factory

### Source Fixes

None. No source code changes were required.

### Lint

`npm run lint` — **No ESLint warnings or errors** (clean after adding display-name disable comments to new test files)
