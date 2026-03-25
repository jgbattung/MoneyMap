# Optimistic Updates — Transactions Verification

## Status
13 tasks committed. **All flows working: create (all types), delete via desktop table (all types), delete via mobile edit drawer (all types).**

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Add optimistic create to useExpenseTransactionsQuery | 85d102d | ✓ Done |
| 2 | Update CreateExpenseTransactionDrawer/Sheet for optimistic create | 5593e71 | ✓ Done |
| 3 | Add optimistic delete to useExpenseTransactionsQuery | 85d102d | ✓ Done (same commit as #1 — both in same file) |
| 4 | Update ExpenseTable for optimistic delete | eda6e16 | ✓ Done |
| 5 | Update EditExpenseDrawer for optimistic delete | 4e8f0f2 | ✓ Done |
| 6 | Add optimistic create and delete to useIncomeTransactionsQuery | f740df6 | ✓ Done |
| 7 | Update CreateIncomeTransactionDrawer/Sheet, IncomeTable, EditIncomeDrawer | 30c783d | ✓ Done |
| 8 | Add optimistic create and delete to useTransfersQuery | 349de35 | ✓ Done |
| 9 | Update CreateTransferDrawer/Sheet, TransferTable, EditTransferDrawer | 327fe1e | ✓ Done |
| 10 | Export RECENT_TRANSACTION_QUERY_KEYS from useRecentTransactions | b9f2579 | ✓ Done |
| 11 | Filter undefined entries from getQueriesData snapshots (Phase 7) | 079ce1a | ✓ Done |
| 12 | Gate single-transaction queries behind drawer open state + remove isDeleting (Phase 7+8) | 079ce1a | ✓ Done |
| 13 | Add isListQuery predicate to all onMutate handlers (Phase 9) | 079ce1a | ✓ Done |

## Verification Steps

### Build & Lint
- `npm run lint` — PASS (no warnings or errors)
- `npm run build` — PASS (zero TypeScript or compilation errors)

### Files Changed
**Hooks (4 modified):**
- `src/hooks/useExpenseTransactionsQuery.ts` — optimistic create + delete, `CreateExpenseVariables` type, `isListQuery` predicate, undefined filtering, `enabled` gating on single-transaction query
- `src/hooks/useIncomeTransactionsQuery.ts` — same pattern
- `src/hooks/useTransferTransactionsQuery.ts` — same pattern
- `src/hooks/useRecentTransactions.ts` — exported `RECENT_TRANSACTION_QUERY_KEYS`

**Create drawers/sheets (6 modified):**
- `src/components/forms/CreateExpenseTransactionDrawer.tsx`
- `src/components/forms/CreateExpenseTransactionSheet.tsx`
- `src/components/forms/CreateIncomeTransactionDrawer.tsx`
- `src/components/forms/CreateIncomeTransactionSheet.tsx`
- `src/components/forms/CreateTransferDrawer.tsx`
- `src/components/forms/CreateTransferSheet.tsx`

**Desktop tables (3 modified):**
- `src/components/tables/expenses/ExpenseTable.tsx`
- `src/components/tables/income/IncomeTable.tsx`
- `src/components/tables/transfers/TransferTable.tsx`

**Edit drawers (3 modified):**
- `src/components/forms/EditExpenseDrawer.tsx` — removed `isDeleting`, passes `{ enabled: open }` to single-transaction query
- `src/components/forms/EditIncomeDrawer.tsx` — same
- `src/components/forms/EditTransferDrawer.tsx` — same

### Pattern Applied (All 3 Transaction Types)

**Create mutation:**
- `onMutate`: Cancel queries (with `isListQuery` predicate) → snapshot (with undefined filtering) → build optimistic objects → prepend to first-page/no-search/compatible-date cache entries (predicate + `isListQuery`) → prepend to recentTransactions (always, trim to 5) → return snapshot
- `onError`: Restore paginated + recent snapshots → show error toast
- `onSettled`: Invalidate all related query keys (replaces optimistic with real data)

**Delete mutation:**
- `onMutate`: Cancel queries (with `isListQuery` predicate) → snapshot (with undefined filtering + `isListQuery` predicate) → filter deleted id from ALL paginated entries + decrement total (with `isListQuery` predicate) → filter from recentTransactions → return snapshot
- `onError`: Restore paginated + recent snapshots → show error toast
- `onSettled`: Invalidate all related query keys

**Create drawers/sheets:**
- Fire `toast.success` → `form.reset()` → `onOpenChange(false)` → call `createXxx({ payload, meta })` fire-and-forget
- No `try/catch` (error handling is in hook's `onError`)

**Desktop tables:**
- Close dialog → clear state → fire `toast.success` → call `deleteXxx(id)` fire-and-forget

**Mobile edit drawers:**
- Close dialog → close drawer → fire `toast.success` → call `deleteXxx(idToDelete)` fire-and-forget
- `isDeleting` prop removed from `DeleteDialog` (no longer needed — drawer closes before mutation resolves)

### Bugfixes Applied (Phases 7–9)

**Phase 7: Filter undefined + remove isDeleting**
- Added `.filter(([, data]) => data !== undefined)` to all 6 `getQueriesData` calls to prevent parasitic cache entries from corrupting rollback snapshots
- Removed `isDeleting` prop from `DeleteDialog` in all 3 edit drawers and removed the `isDeleting` destructure from hook calls

**Phase 8: Gate single-transaction queries**
- Added optional `enabled` parameter to `useExpenseTransactionQuery`, `useIncomeTransactionQuery`, `useTransferQuery`
- Edit drawers pass `{ enabled: open }` to prevent cross-endpoint 404s when `TransactionsMobileView` mounts all 3 drawers with a shared `selectedTransactionId`

**Phase 9: Predicate guard for query key collision (root cause fix)**
- Root cause: `setQueriesData({ queryKey: ['expenseTransactions'] })` used prefix matching and matched single-transaction queries `['expenseTransactions', id]`, whose data is a flat `ExpenseTransaction` (no `.transactions` property). The updater crashed with `TypeError: Cannot read properties of undefined (reading 'filter')`
- Fix: Added `isListQuery` predicate to all `cancelQueries`, `getQueriesData`, and `setQueriesData` calls in onMutate handlers (18 total call sites across 3 hooks). The predicate checks `typeof query.queryKey[1] === 'object'` to distinguish list queries from single-transaction queries.

### Manual Test Checklist (for developer verification)

For each of expense, income, transfer:

**Create — Happy path:**
- [x] Open create drawer, fill form, submit
- [x] Drawer closes immediately, success toast appears immediately
- [x] New item appears at top of list (first page, no search, compatible date filter)
- [x] Item appears in recent transactions on dashboard
- [x] After server response, optimistic id replaced by real id

**Create — Skip conditions:**
- [ ] Navigate to page 2 — no optimistic item appears in current view (not manually verified)
- [ ] Enter search term — no optimistic item appears in filtered results (not manually verified)

**Delete (desktop table) — Happy path:**
- [x] Confirm delete → dialog closes immediately, success toast, item removed instantly
- [x] Item removed from recent transactions

**Delete (mobile edit drawer) — Happy path:**
- [x] Confirm delete → dialog + drawer close immediately, success toast, item removed from list
- [x] DELETE request visible in Network tab
- [x] No TypeError in console
- [x] No 404s to wrong endpoints

**Cross-checks:**
- [x] After mobile delete, desktop table delete still works (no cascade failure)
- [x] Dashboard recentTransactions reflects all deletions
- [x] No double toasts

## QA Results

### Test Files Generated / Updated

| File | Tests |
|------|-------|
| `src/hooks/useExpenseTransactionsQuery.test.ts` | 27 test cases |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | 24 test cases |
| `src/hooks/useTransferTransactionsQuery.test.ts` | 23 test cases |

**Total: 74 tests across 3 files**

### Vitest Results

**Individual files:** 27 passed, 24 passed, 23 passed — all green
**Full suite:** 1094 passed, 0 failed (66 test files)

### Playwright Results

Not applicable — no E2E spec was required for this feature.

### New Test Coverage Added

All three hook files received the following new test suites:

- **`isListQuery` predicate** — verifies that list keys (object at `[1]`) and single-transaction keys (string at `[1]`) are correctly distinguished
- **Optimistic create — prepend** — verifies item is prepended to first-page cache before API responds (id matches `optimistic-*`)
- **Optimistic create — skip conditions** — verifies pages with `skip > 0` and active search filters are not prepended to
- **Optimistic create — rollback on error** — verifies cache is fully restored to original snapshot after API failure
- **Undefined filtering** — verifies that unseeded cache keys remain `undefined` after rollback (`.filter(([, data]) => data !== undefined)`)
- **isListQuery guard on delete** — verifies single-transaction keys (`['expenseTransactions', 'id']`) are untouched by delete optimistic update
- **Optimistic delete — remove + decrement** — verifies item is removed and total is decremented before API responds
- **Optimistic delete — rollback on error** — verifies cache restoration on delete failure
- **`enabled` gating** — `useExpenseTransactionQuery`, `useIncomeTransactionQuery`, `useTransferQuery` all tested with `enabled: false` (no fetch), `enabled: true` (fetches), and empty-string id (no fetch)
- **recentTransactions optimistic update** — verifies POST is made and cache initialised when empty

### Fixes Applied

| File | Fix |
|------|-----|
| `src/hooks/useExpenseTransactionsQuery.test.ts` | Fixed fragile `toHaveBeenCalledTimes(2)` assertion in recentTransactions test — replaced with `toHaveBeenCalledWith(url, options)` to avoid counting background refetches triggered by `onSettled` invalidation (Category A) |

### Source Fixes

None. All fixes were in test code only.

### Final Status

**PASS** — 1094/1094 tests green, lint clean, zero regressions.

## Notes

- `TransferTransaction.amount` is `number` (not `string` like expense/income). The optimistic builder uses `parseFloat()` accordingly.
- `RecentTransaction.amount` is always `number` — all three `buildOptimisticRecent*` helpers use `parseFloat()`.
- The `CreateExpenseTransactionSheet` and `CreateTransferSheet` desktop variants were also updated to match the drawer pattern.
- The update (edit) mutations were left on `onSuccess` — optimistic edits are out of scope for this feature.
- `RECENT_TRANSACTION_QUERY_KEYS` is now the single source of truth for the `['recentTransactions']` key across all three hooks.
- The `isListQuery` predicate is critical infrastructure — any future optimistic updates on these hooks must include it to avoid query key collisions with single-transaction queries.
