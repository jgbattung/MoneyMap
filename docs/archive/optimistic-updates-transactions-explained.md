# Optimistic Updates — Transactions — Explained

> Generated from: spec (optimistic-updates-transactions-spec.md), plan (optimistic-updates-transactions-plan.xml), verification (optimistic-updates-transactions-verification.md)
> Branch: feature/optimistic-updates-transactions
> Date: 2026-03-25

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 13 |
| Files created | 0 |
| Files modified | 19 (excluding docs) |
| Tests written | 3 test files, 74 new tests (1094 total passing) |
| Commits | 13 |

**In one sentence:** Optimistic create and delete mutations were added across all three transaction types (expenses, income, transfers) so the UI updates instantly on user action — with automatic rollback and an error toast if the server rejects the mutation — eliminating the loading delay that previously made the app feel slow.

---

## What Was Built

Before this feature, every create and delete action in Money Map followed a "pessimistic" flow: the component awaited the API call, and only after the server confirmed success did the drawer close, the list update, and the success toast appear. On a slow connection this meant a visible delay of one to several seconds between the user pressing "Save" or "Delete" and anything changing on screen.

The feature replaces that with an optimistic flow for all create and delete mutations on expense, income, and transfer transactions. When the user submits a form or confirms a delete, the UI responds immediately: the drawer or dialog closes, a success toast fires, and the list updates — all before the network request has even returned. If the server later reports an error, the change is silently rolled back (the list is restored to its pre-mutation state) and an error toast explains what went wrong.

Three clusters of bugs were discovered and fixed during implementation. First, TanStack Query's prefix-matching meant that `setQueriesData({ queryKey: ['expenseTransactions'] })` accidentally targeted single-transaction queries (e.g., `['expenseTransactions', 'some-id']`), causing `TypeError` crashes in the mobile edit drawer. Second, edit drawers were making cross-endpoint API calls because all three drawer types were mounted simultaneously in `TransactionsMobileView` and all fired on the same `selectedTransactionId`. Third, optimistic snapshots included `undefined` cache entries, which when restored during rollback could corrupt live cache slots. All three bugs were addressed with targeted fixes before the feature shipped.

---

## Deep Dive

### Data Layer

No schema changes were made. This feature is entirely client-side cache management — no Prisma migrations, no new database columns, and no changes to the API response shapes.

### API Layer

No API routes were created or modified. The same `/api/expense-transactions`, `/api/income-transactions`, and `/api/transfer-transactions` endpoints are called. The only difference is that components no longer `await` them — they fire them as background mutations.

### State and Data Fetching Layer

This is where most of the work happened. Each of the three transaction query hooks (`useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useTransferTransactionsQuery`) received the same structural upgrade to both their create and delete mutations:

**Optimistic object builders.** Each hook now has two builder functions: one that constructs a full typed transaction object (e.g., `buildOptimisticExpense`) and one that constructs a `RecentTransaction` shape (`buildOptimisticRecentExpense`). The transaction objects carry a temporary `id` prefixed with `optimistic-` (generated via `crypto.randomUUID()`) so they can be distinguished from real server-assigned IDs. One important type note: `ExpenseTransaction.amount` and `IncomeTransaction.amount` are strings, but `TransferTransaction.amount` and `RecentTransaction.amount` are numbers — the builders handle this with `parseFloat()` where needed.

**Mutation lifecycle (onMutate / onError / onSettled).** The `onMutate` handler runs before the API call. It cancels any outgoing refetches (to prevent them from overwriting the optimistic state), snapshots the current cache for rollback, writes the optimistic objects into the cache, and returns the snapshot as the mutation context. The `onError` handler receives that snapshot via `context` and restores it, then shows an error toast. `onSettled` (which fires on both success and error) invalidates all related queries — this is what replaces the temporary `optimistic-*` id with the real server-assigned id after a successful mutation.

**Why onSettled instead of onSuccess for invalidation.** `onSuccess` only fires on success. If a mutation fails, the rollback restores the cache from the snapshot, but we still want to refetch to ensure the server and client are in sync. Moving invalidation to `onSettled` ensures this happens regardless of outcome.

**The `isListQuery` predicate.** All `cancelQueries`, `getQueriesData`, and `setQueriesData` calls in `onMutate` now include a predicate: `typeof query.queryKey[1] === 'object' && query.queryKey[1] !== null`. This distinguishes list queries (whose second key element is a params object, e.g., `{ skip: 0, take: 20 }`) from single-transaction queries (whose second key element is a string ID). Without this, prefix matching caused the updater functions to run on single-transaction cache entries, which have a flat object shape with no `.transactions` array, producing a `TypeError`.

**The `isFirstPage/noSearch/dateFilter` prepend condition.** For create, the optimistic item is only prepended to a paginated cache entry when: the page is the first page (`skip === 0`), there is no active search, and the date filter is compatible (`undefined`, `view-all`, `this-month`, or `this-year`). This prevents an item created today from appearing at the top of a filtered view for a different month or a search that wouldn't match it. For the `recentTransactions` cache, prepend always happens unconditionally (trimmed to 5 entries).

**Undefined entry filtering.** Edit drawers call their respective list hooks without options, which registers a cache entry with `undefined` data. `getQueriesData` with prefix matching picks this up in the snapshot. When `onError` runs rollback, `setQueryData(key, undefined)` would overwrite a live cache slot with `undefined`. The fix is `.filter(([, data]) => data !== undefined)` chained to every `getQueriesData` call, so only entries with real data are included in the snapshot.

**Single-transaction query `enabled` gating.** In `TransactionsMobileView`, all three edit drawer types are mounted simultaneously and receive the same `selectedTransactionId`. When a user taps an expense row, the expense ID is set — but the income and transfer drawers, still mounted, would pass that same ID to their respective single-transaction fetch hooks and fire GET requests to `/api/income-transactions/{expenseId}` and `/api/transfer-transactions/{expenseId}`, getting 404s. The fix adds an optional `{ enabled?: boolean }` parameter to each single-transaction query hook and changes their `enabled` condition to `!!id && (options?.enabled ?? true)`. Edit drawers now pass `{ enabled: open }`.

**Mutation variables type change for create.** The create mutation variables type was widened from a plain `Record<string, unknown>` to `{ payload: Record<string, unknown>; meta: { accountName: string; ... } }`. The `mutationFn` still only sends `payload` to the API. The `meta` object carries display names (account name, type name) that are needed to build the optimistic object but are not part of the API contract. This keeps the builder functions pure — they receive all necessary data from the caller rather than reaching into other queries.

**`RECENT_TRANSACTION_QUERY_KEYS` export.** The `useRecentTransactions` hook previously defined its query key as a private constant. It is now exported as `RECENT_TRANSACTION_QUERY_KEYS`, providing a single authoritative source for the `['recentTransactions']` key used in all three transaction hooks.

### UI Layer

**Create drawers and sheets (6 files).** The `onSubmit` handlers were rewritten. The old flow: build payload, `await` mutation, then fire toast and close. The new flow: build payload, look up display names from already-loaded arrays (accounts, type lists), fire `toast.success`, call `form.reset()`, call `onOpenChange(false)`, then call the mutation fire-and-forget with no `await` and no `try/catch`. Error handling is now entirely in the hook's `onError`. This pattern applies to both the drawer and sheet variants of each create form (6 files total).

**Desktop tables (3 files).** The `handleDeleteConfirm` function in each table was rewritten. The old flow: `await` mutation, then close dialog. The new flow: capture the transaction ID in a local `const` before clearing state (critical — the state clear happens before the mutation call), close the dialog, reset table state, fire `toast.success`, call the delete mutation fire-and-forget. The `isDeleting` spinner on the dialog confirm button is now irrelevant because the dialog closes before the mutation returns, but the `isDeleting` flag is still returned from the hook for backward compatibility.

**Mobile edit drawers (3 files).** Same restructuring as the desktop tables, but `onOpenChange(false)` (closing the drawer itself) is also called immediately before firing the mutation. The `isDeleting` prop was removed from the `<DeleteDialog>` component in all three drawers. It was previously passed to disable the Cancel and Delete buttons during the mutation, but since the dialog closes on the frame of the click, the buttons never reach a disabled state — and a stale `true` value from a prior settling mutation could block the button unexpectedly.

### Validation Layer

No Zod schemas were added or modified. The feature touches only mutation flow and cache management, not input validation.

---

## Data Flow

The most instructive path is an optimistic create for an expense transaction:

1. **User fills the CreateExpenseTransactionDrawer form and presses "Save".** The form's `onSubmit` handler fires.
2. **`onSubmit` builds the API payload** from form values — same object as the old pessimistic flow.
3. **`onSubmit` looks up display names** from already-loaded data arrays (`allAccounts`, `budgets`, subcategories). These are used only for the optimistic object, not sent to the API.
4. **`toast.success(...)` fires.** The user sees "Expense transaction created successfully" before any network activity begins.
5. **`form.reset()` and `onOpenChange(false)` run.** The drawer closes on this same frame.
6. **`createExpenseTransaction({ payload, meta })` is called fire-and-forget** — no `await`, no `try/catch`.
7. **TanStack Query runs `onMutate`.** It calls `queryClient.cancelQueries` with the `isListQuery` predicate to halt any in-flight refetches for the list queries. It then calls `queryClient.getQueriesData` (also with `isListQuery` + `undefined` filter) to snapshot the current paginated cache state and saves `queryClient.getQueryData(['recentTransactions'])`.
8. **`buildOptimisticExpense(payload, meta)` runs**, producing a full `ExpenseTransaction` object with `id: 'optimistic-{uuid}'`.
9. **`queryClient.setQueriesData` with predicate** rewrites eligible cache entries (first page, no search, compatible date filter) to prepend the optimistic expense and increment `total` by 1. The user's list now shows the new item at the top instantly.
10. **`queryClient.setQueryData(['recentTransactions'])` prepends the optimistic recent entry** and trims to 5. The dashboard widget reflects the new transaction immediately.
11. **`onMutate` returns `{ previousTransactions, previousRecent }`** — this becomes the mutation context available to `onError`.
12. **The HTTP POST to `/api/expense-transactions`** fires with the API payload.

**On success:**
13. **`onSettled` invalidates** all related query keys (`expenseTransactions`, `accounts`, `netWorth`, `recentTransactions`, etc.). TanStack Query refetches the list in the background and replaces the `optimistic-{uuid}` item with the real server object (real ID, server-assigned timestamps).

**On error:**
13. **`onError` runs**. It iterates `context.previousTransactions` and calls `queryClient.setQueryData` for each entry to restore the snapshot. It calls `queryClient.setQueryData(['recentTransactions'], context.previousRecent)`. The optimistic item disappears from the list.
14. **`toast.error(...)` fires** — "Failed to create expense transaction. The transaction could not be saved. Please try again."
15. **`onSettled` still runs** after `onError` and issues the same invalidation, ensuring the cache fully resynchronizes with the server.

---

## Files Changed

| File | Change Type | What Changed |
|------|-------------|--------------|
| `src/hooks/useExpenseTransactionsQuery.ts` | Modified | Added `buildOptimisticExpense`, `buildOptimisticRecentExpense`, `CreateExpenseVariables` type, `onMutate`/`onError` to create and delete mutations, `onSuccess` → `onSettled`, `isListQuery` predicate, undefined filtering, `enabled` gating on single-transaction query |
| `src/hooks/useIncomeTransactionsQuery.ts` | Modified | Same pattern as expense hook; income-specific invalidation list (`incomeBreakdown`, no `cards`) preserved |
| `src/hooks/useTransferTransactionsQuery.ts` | Modified | Same pattern; `amount` uses `parseFloat()` (number, not string); transfer-specific invalidation list (includes `expenseTransactions`) preserved |
| `src/hooks/useRecentTransactions.ts` | Modified | Exported `RECENT_TRANSACTION_QUERY_KEYS` as a named constant |
| `src/components/forms/CreateExpenseTransactionDrawer.tsx` | Modified | `onSubmit` rewritten: fire toast + reset + close before fire-and-forget mutation; `try/catch` removed; `meta` lookup added |
| `src/components/forms/CreateExpenseTransactionSheet.tsx` | Modified | Same as drawer variant |
| `src/components/forms/CreateIncomeTransactionDrawer.tsx` | Modified | Same pattern as expense drawer |
| `src/components/forms/CreateIncomeTransactionSheet.tsx` | Modified | Same as drawer variant |
| `src/components/forms/CreateTransferDrawer.tsx` | Modified | Same pattern; looks up `fromAccountName`, `toAccountName`, `transferTypeName` for meta |
| `src/components/forms/CreateTransferSheet.tsx` | Modified | Same as drawer variant |
| `src/components/tables/expenses/ExpenseTable.tsx` | Modified | `handleDeleteConfirm` rewritten: close dialog + reset state + toast before fire-and-forget delete; `try/catch` removed |
| `src/components/tables/income/IncomeTable.tsx` | Modified | Same pattern as expense table |
| `src/components/tables/transfers/TransferTable.tsx` | Modified | Same pattern as expense table |
| `src/components/forms/EditExpenseDrawer.tsx` | Modified | `handleDeleteConfirm` rewritten for optimistic flow; `isDeleting` removed from `<DeleteDialog>`; passes `{ enabled: open }` to single-transaction query hook |
| `src/components/forms/EditIncomeDrawer.tsx` | Modified | Same as EditExpenseDrawer |
| `src/components/forms/EditTransferDrawer.tsx` | Modified | Same as EditExpenseDrawer |
| `src/hooks/useExpenseTransactionsQuery.test.ts` | Modified | 27 new test cases for optimistic create/delete, rollback, skip conditions, `isListQuery`, undefined filtering, `enabled` gating |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | Modified | 24 new test cases (same coverage as expense) |
| `src/hooks/useTransferTransactionsQuery.test.ts` | Modified | 23 new test cases (same coverage as expense) |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|---------------|-----------|
| `src/hooks/useExpenseTransactionsQuery.test.ts` | Full optimistic lifecycle for expense create and delete | `isListQuery` predicate distinguishes list vs single-transaction keys; create prepends to first-page cache; skip conditions (page 2, active search) block prepend; rollback fully restores cache on error; undefined entries remain undefined after rollback; delete removes item and decrements total; delete rollback restores; `enabled: false` prevents single-transaction fetch |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | Full optimistic lifecycle for income create and delete | Same coverage as expense test file; income-specific query key and API endpoint used |
| `src/hooks/useTransferTransactionsQuery.test.ts` | Full optimistic lifecycle for transfer create and delete | Same coverage; verifies `amount` is `number` in optimistic object (not string) |

All tests run with Vitest 1.x against a mocked TanStack Query client. The strategy is to seed the query client with controlled cache state, fire the mutation, and assert the cache's intermediate state (after `onMutate`, before the API resolves) and final state (after `onError` rollback or `onSettled` invalidation). This directly tests the cache manipulation logic without requiring a real API or browser. The full suite runs 1094 tests across 66 files with zero failures.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|------------|----------------------|
| Optimistic UI | Updating the client state before the server confirms, then reconciling on response | The create/delete mutations write a fake object into the TanStack Query cache in `onMutate` so the list updates before the HTTP request completes |
| TanStack Query `onMutate` context | `onMutate` returns an arbitrary value that becomes `context` in `onError` and `onSettled` | Used to pass the pre-mutation cache snapshot through to `onError` for rollback, without storing it in component state |
| `cancelQueries` before optimistic write | Cancels in-flight refetches so they cannot overwrite the just-written optimistic state | Called at the start of every `onMutate` with the `isListQuery` predicate to avoid cancelling single-transaction fetches |
| `getQueriesData` / `setQueriesData` with predicate | Bulk read/write across all cache entries matching a query key prefix, optionally filtered by a predicate function | Used to update or snapshot all paginated list caches for a transaction type at once; the predicate distinguishes list queries (`queryKey[1]` is an object) from single-transaction queries (`queryKey[1]` is a string) to prevent type errors |
| `onSettled` vs `onSuccess` for invalidation | `onSettled` fires after both success and error; `onSuccess` fires only after success | Invalidation was moved to `onSettled` so the cache re-syncs with the server even when a mutation fails, ensuring rollback + invalidation together leave the cache in a clean state |
| Fire-and-forget mutation | Calling `mutation.mutate()` (not `await mutation.mutateAsync()`) so the component does not block on the network | Drawers and tables call the mutation after closing/resetting, so there is no UI that could await it; error handling is entirely in the hook's `onError` |
| Query key prefix matching (and its pitfall) | TanStack Query matches cache entries by checking if a stored key starts with the provided filter key | `['expenseTransactions']` matches both `['expenseTransactions', { skip: 0 }]` (list) and `['expenseTransactions', 'some-id']` (single); the `isListQuery` predicate was added specifically to avoid the collision |
| Snapshot + rollback pattern | Taking a deep snapshot of cache state before mutating it, then restoring that snapshot on error | `getQueriesData` returns `[queryKey, data][]`; each pair is stored in the mutation context and individually restored via `setQueryData` in `onError` |

---

## What To Look At Next

- `src/hooks/useExpenseTransactionsQuery.ts` — This is the canonical reference for the full optimistic pattern. Read it to understand how `isListQuery`, the prepend predicate, undefined filtering, and the `onMutate`/`onError`/`onSettled` trio are assembled together. The income and transfer hooks are structurally identical.
- `src/components/forms/CreateExpenseTransactionDrawer.tsx` — Best place to see how the UI side of the optimistic flow works: the ordering of toast, form reset, drawer close, and the fire-and-forget mutation call with the `meta` object.
- `src/hooks/useExpenseTransactionsQuery.test.ts` — The most complete test file for this feature. Reading the test cases (especially "skip conditions" and "rollback on error") is the fastest way to build intuition for the edge cases the implementation handles.
