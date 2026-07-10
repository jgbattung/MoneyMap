# Query Hooks

Loaded when working in `src/hooks/`. One hook per domain; list query keys are `['domain', { ...params }]` - the params object as second element is what the shared `isListQuery` predicate matches on.

## Mutation recipe (every transaction create/update/delete follows this)

`useExpenseTransactionsQuery.ts` is the reference implementation; income/transfer are twins. Steps:

1. **onMutate:** `cancelQueries` for the list predicate (+ recentTransactions where shown) -> snapshot via `getQueriesData(...)` filtered to `data !== undefined` -> `snapshotBalanceCaches(queryClient)`.
2. Build the optimistic row with id `` `optimistic-${crypto.randomUUID()}` `` and patch caches with `setQueriesData`:
   - create: prepend only to first-page / unfiltered list caches (see the predicate in the reference impl), bump `total`; prepend to recentTransactions and `slice(0, 5)`.
   - update: merge **scalar fields only** - relation display objects (`account`, `expenseType`) reconcile via the refetch. The old row comes from the cached lists; if it isn't cached, skip balance optimism entirely.
   - delete: filter the row out, decrement `total`.
3. Apply balance deltas with `applyAccountDelta` / `applyBudgetSpentDelta` from `optimisticBalances.ts`. Signs mirror the server (expense -, income +, transfer -from/+to/-fee; update = reverse old then apply new; delete = reverse). Installment parents are excluded from balance/budget deltas.
4. Return all snapshots as the mutation context.
5. **onError:** write every snapshot back (`setQueryData` per entry, `restoreBalanceCaches`) + sonner toast.
6. **onSuccess (create only):** merge the real server id onto the `optimistic-` row - do NOT replace the row wholesale; the POST response lacks the relations the tables render.
7. **onSettled:** `invalidateAfterTransactionWrite(queryClient, ownListKey, extraEagerKeys?)` - the ONLY place post-write invalidation happens.

## Rules

- Optimistic patching is best-effort by design: helpers no-op on unpopulated caches, and the eager invalidation reconciles with server truth. Never make correctness depend on the optimistic path.
- Net worth: patch `currentNetWorth` only; `monthlyChange` always waits for the server (deliberate - don't replicate the percentage math client-side).
- Balances/amounts in caches are **strings** (Prisma Decimal serialization): `parseFloat` -> arithmetic -> `toFixed(2)` back to string.
- New queries that should refresh after transaction writes get added to `EAGER_KEYS` (visible, cheap) or `DEFERRED_KEYS` (heavy reports, `refetchType: 'none'`) in `transactionInvalidations.ts` - never ad-hoc invalidation in a hook.
- Report hooks (`useTransactionAnalysis`, `useEventLedger`) fetch on explicit trigger only: `enabled: false`, params state object as the query key, `setTimeout(() => refetch(), 0)` after setting params. Preserve this; data must load only on button click.
- Budget spend deltas only apply when the transaction date is in the current month (the server groupBy is month-scoped) - `applyBudgetSpentDelta` already guards this.
