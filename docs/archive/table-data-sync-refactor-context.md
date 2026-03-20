# Table Data Sync Refactor — Context for Architect

## Problem Summary

The three desktop transaction tables (Expense, Income, Transfer) maintain a **local copy** of data in React state (`data` / `originalData`) that is separate from the TanStack Query cache. This local copy only syncs from the query cache under narrow conditions, causing two related bugs:

### Bug 1: Pagination resets on inline edit

When a user is on page 2+ and edits a field (e.g., adds a tag), `updateData` mutates local `data` state, which recomputes `filteredData`, which changes the array reference passed to TanStack Table — resetting pagination to page 1. The user has to manually navigate back to the page they were on.

### Bug 2: Stale data after save (tags not searchable until hard refresh)

After saving an inline edit, the mutation invalidates the query and fresh data is re-fetched from the API. However, the `useEffect` that syncs query data into local `data` state only triggers when **array length or ID order changes**:

```ts
// ExpenseTable.tsx ~line 380
const hasChanged =
  expenseTransactions.length !== prevTransactionsRef.current.length ||
  expenseTransactions.some((t, i) => t.id !== prevTransactionsRef.current[i]?.id);
```

Editing a tag on an existing transaction doesn't change length or ID order, so `hasChanged` is `false` and `setData` never fires. The local state retains the stale version (with string tag IDs instead of full objects), making tag-name search fail until a hard refresh forces a full re-mount.

## Root Cause

The tables use a **dual-state architecture**:
- **TanStack Query** owns the server-truth (`expenseTransactions` from the hook)
- **Local React state** (`data`, `originalData`) owns the edit-truth for inline editing
- A `useEffect` bridges the two, but its change detection is too shallow

This architecture was designed to support inline editing without losing unsaved changes on every re-fetch, but it creates the sync gap described above.

## Files Affected

All three tables share the same pattern:
- `src/components/tables/expenses/ExpenseTable.tsx`
- `src/components/tables/income/IncomeTable.tsx`
- `src/components/tables/transfers/TransferTable.tsx`

## Key Code Locations (ExpenseTable as reference)

| What | Location |
|------|----------|
| Local state declaration | `useState<ExpenseTransaction[]>([])` ~line 366-367 |
| Shallow sync useEffect | ~line 378-389 |
| `updateData` (inline edit writes) | ~line 531-539 |
| `filteredData` useMemo (client-side filtering) | ~line 427-459 |
| Table receives `filteredData` as `data` prop | ~line 590 |
| `saveRow` (triggers mutation + invalidation) | ~line 272-311 |

## Constraints

- Inline editing must continue to work — users need to modify cells, see the changes locally, then save.
- Pagination should NOT reset when editing a cell or when data re-fetches after save.
- After save, the local state must reflect the fresh server data (including new tags as full objects, not string IDs).
- The `TagInput` component emits `string[]` (tag IDs), not full tag objects. The `TagsCell` component already handles this normalization for display, but `filteredData` and local state do not.

## Possible Approaches to Investigate

1. **Use TanStack Table's built-in filtering** (`getFilteredRowModel`) instead of pre-filtering `data` before passing it — this would decouple filtering from the data array identity, potentially solving pagination reset.
2. **Deep-compare sync** — replace the shallow `hasChanged` check with a proper deep comparison (e.g., JSON hash of the data), so content changes (like tag edits) trigger `setData`. Risk: may re-introduce pagination reset if not handled carefully.
3. **Remove local state entirely** — use TanStack Query data directly as the table's source of truth, and track edits in a separate `pendingEdits` map keyed by row ID. This is the cleanest but largest refactor.
4. **Normalize tag data on write** — when `updateData` stores tag IDs, immediately look up full objects from `useTagsQuery` and store those instead. This fixes the tag-specific symptom but not the general sync problem.

## Related Work Already Done

- The `typeof tag === 'object'` guard was added to `filteredData` in all 3 tables to prevent the `TypeError` crash when tags are string IDs (commit `e14465f` on `feature/search-by-tags`).
- The `TagFilter` component and `tagIds` API param were removed in favor of unified text search (see `docs/archive/search-tags-cleanup-*`).

