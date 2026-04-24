# Table Data Sync Refactor — Explained

> Generated from: docs/archive/table-data-sync-refactor-spec.md, docs/archive/table-data-sync-refactor-plan.xml, docs/archive/table-data-sync-refactor-verification.md
> Branch: refactor/table-data-sync
> Date: 2026-03-20

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 5 |
| Files created | 1 |
| Files modified | 3 |
| Tests written | 2 test files written/expanded, 839 total tests passing |
| Commits | 4 code commits + 1 docs commit |

**In one sentence:** Replaced the dual-state architecture in all three transaction tables (Expense, Income, Transfer) with a single-source-of-truth `useEditableTable` hook, eliminating pagination resets during inline editing and stale tag data after saves.

---

## What Was Built

Before this refactor, every transaction table kept two parallel copies of its data: the React Query server cache, and a local `useState` copy that was kept "in sync" via a `useEffect`. When a user edited a cell inline, `updateData()` wrote to the local state copy. This triggered a recompute of `filteredData` with a new array reference — and because TanStack Table sees a new data array, it reset pagination to page 1 every time any edit was made. A user browsing page 3 would get kicked back to page 1 the moment they started typing in an inline edit field.

A second bug lived in the sync `useEffect`. It compared the server data to the local copy using only array length and row ID order — a shallow check. If a user edited a tag and saved, the server returned fresh data with the updated tag, but since the array length and IDs were unchanged, the `useEffect` decided "nothing changed" and never updated local state. Tags in local state remained as raw string IDs, making them invisible to the tag-name search filter.

The fix introduces a `useEditableTable` hook that eliminates the local data copy entirely. React Query data flows directly into a memoized `mergedData` computation that overlays any in-flight pending edits. Pending edits live in a separate `Record<id, Partial<T>>` map, so TanStack Table's input data only changes when the server data actually changes — pagination is stable during editing. On save, React Query invalidates and refetches, and fresh data flows directly into the table without any sync logic.

---

## Deep Dive

### Data Layer

No schema changes were made. This was a pure frontend refactor.

### API Layer

No API routes were created or modified.

### State and Data Fetching Layer

**New hook: [src/hooks/useEditableTable.ts](src/hooks/useEditableTable.ts)**

This is the heart of the refactor. The hook accepts `queryData` (the live React Query array) and optional `allTags` (for tag normalization), and returns everything a table needs to manage inline editing.

**`pendingEdits: Record<string, Partial<T>>`** — a map from transaction ID to a partial overlay of changed fields. Only changed columns live here; the rest of each row still comes from `queryData`.

**`mergedData`** — a `useMemo` that produces the effective display data by merging `queryData` with `pendingEdits`. For each row, if `pendingEdits[row.id]` exists, it spreads the pending changes on top of the server row (`{ ...row, ...pendingEdits[row.id] }`). Critically, it also normalizes tags here: if `pendingEdits[row.id].tags` is an array of string IDs (as emitted by `TagInput`), it resolves each ID to a full `{ id, name, color }` object via `allTags.find()`. This guarantees `filteredData` always operates on full tag objects.

**`updateData(rowId, columnId, value)`** — writes to `pendingEdits` using functional `setState`. Updating `pendingEdits` does not touch `queryData`, so TanStack Table's data reference is stable during editing and pagination never resets.

**`revertData(rowId)` / `clearPendingEdits(rowId)`** — both delete `pendingEdits[rowId]`. They are separate functions for semantic clarity: `revertData` is called on cancel (the row reverts to server state), `clearPendingEdits` is called after a successful save (the fresh server data is already in the React Query cache, so the pending overlay just needs to be removed).

**Three tables wired to the hook:** `ExpenseTable.tsx`, `IncomeTable.tsx`, and `TransferTable.tsx` all had their `useState(data)`, `useState(originalData)`, `useRef(prevTransactionsRef)`, and sync `useEffect` removed — replaced by a single `useEditableTable(...)` call each.

### UI Layer

**`autoResetPageIndex: false`** was added to all three `useReactTable` configs. By default TanStack Table resets `pageIndex` to 0 whenever the data array changes. Disabling this keeps the user on their current page when `mergedData` updates during editing.

**Empty-page safety `useEffect`** was added after each `useReactTable` call. When `autoResetPageIndex: false` is set, deleting or filtering away all rows on the current page would leave the user on an empty page. The effect clamps `pageIndex` to `pageCount - 1` whenever `filteredData.length` changes.

**`typeof tag === 'object'` guard removed** from the tag search inside `filteredData`. Before, this guard prevented crashes because tags in local state might be raw string IDs. Since `mergedData` now guarantees full tag objects, the guard is unnecessary.

**`clearPendingEdits` added to `tableMeta`** — `saveRow()` inside `EditCell` now calls `meta.clearPendingEdits(row.original.id)` after a successful mutation, completing the cycle: save succeeds → pending edit cleared → React Query refetch → fresh server data flows in.

### Validation Layer

No Zod schemas were added or modified.

---

## Data Flow

The most important user action: **inline edit a cell, then save.**

1. User clicks the edit icon on a row — `setEditedRows({ [rowIndex]: true })` puts the row into edit mode (UI only).
2. User types a new value in a cell — `updateData(transactionId, "amount", 150)` runs.
3. `setPendingEdits(prev => ({ ...prev, [transactionId]: { ...prev[transactionId], amount: 150 } }))` updates the pending edits map via functional setState.
4. `mergedData` recomputes: for this row, `{ ...serverRow, amount: 150 }` is returned. All other rows are returned unchanged from `queryData`.
5. `filteredData` recomputes from `mergedData` — the updated value is visible in the cell. `queryData` (the React Query cache) is untouched; TanStack Table sees the same stable array reference for all unedited rows.
6. User clicks save — `saveRow()` in `EditCell` reads `table.options.data[row.index]` (the current `filteredData` row with the pending edit merged in) and sends it as the mutation payload to the API.
7. Mutation succeeds → `meta.clearPendingEdits(transactionId)` removes the pending overlay for this row.
8. React Query cache is invalidated → `useExpenseTransactionsQuery` refetches → fresh server data arrives.
9. `mergedData` recomputes with no pending edits for this row — server data flows directly to the table display.

---

## Files Changed

| File | Change Type | What Changed |
|------|------------|--------------|
| `src/hooks/useEditableTable.ts` | Created | New shared hook: `pendingEdits` map, `mergedData` memo with tag normalization, `updateData`, `revertData`, `clearPendingEdits`, `hasPendingEdit`, `editedRows` state |
| `src/components/tables/expenses/ExpenseTable.tsx` | Modified | Removed dual-state (useState data/originalData, useRef, sync useEffect, local updateData/revertData callbacks); wired to `useEditableTable`; added `autoResetPageIndex: false`; added empty-page safety effect; added `clearPendingEdits` to tableMeta and saveRow |
| `src/components/tables/income/IncomeTable.tsx` | Modified | Same pattern as ExpenseTable applied to income transactions |
| `src/components/tables/transfers/TransferTable.tsx` | Modified | Same pattern as ExpenseTable applied to transfers (uses `notes` instead of `description`) |
| `src/hooks/useEditableTable.test.ts` | Created | 29 unit tests for the new hook |
| `src/components/tables/expenses/ExpenseTable.test.tsx` | Modified | Expanded from 13 to 46 test cases; fixed delete flow button selectors |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|--------------|-----------|
| `src/hooks/useEditableTable.test.ts` | The `useEditableTable` hook in isolation | `updateData` merges correctly, `revertData` restores server state, `clearPendingEdits` removes overlay, tag normalization resolves string IDs to full objects, `hasPendingEdit` returns correct boolean, `mergedData` is stable when no pending edits exist |
| `src/components/tables/expenses/ExpenseTable.test.tsx` | ExpenseTable component with the refactored hook wired in | Pagination stability during inline edit, tag search after save, cancel reverts to original value, delete on last page clamps pagination |

The QA pipeline caught one test-code error in `ExpenseTable.test.tsx`: button selectors were too broad (matching buttons across the full row), fixed by scoping queries to the action cell using `within(actionCell).getAllByRole('button')`. No source code bugs were found. Final suite: 839 tests across 51 files, all passing.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| Partial overlay map | A `Record<id, Partial<T>>` that stores only the fields that differ from the server data | `pendingEdits` stores only changed columns per row; the rest of each row is read from `queryData` at merge time — this is why pagination is stable during editing |
| `useMemo` for derived state | React hook that memoizes a computation and only recomputes when dependencies change | `mergedData` and `filteredData` are both `useMemo` — they recompute when `queryData`, `pendingEdits`, or search filters change, but not on every render |
| `autoResetPageIndex: false` | TanStack Table option that disables the automatic reset of `pageIndex` to 0 when data changes | Set to `false` so that updating `mergedData` during an inline edit doesn't jump the user back to page 1 |
| Empty-page safety clamp | A `useEffect` that watches data length and resets `pageIndex` when the current page is beyond the last valid page | Required because `autoResetPageIndex: false` would otherwise leave the user on an empty page after deleting the last row on a non-first page |
| React Query cache invalidation | Calling `queryClient.invalidateQueries(key)` after a mutation triggers a background refetch | After `saveRow()` succeeds, the cache is invalidated → fresh server data flows into `queryData` → `mergedData` recomputes with the latest server state — no manual sync needed |
| Tag normalization at merge time | Resolving string IDs to full `{ id, name, color }` objects inside `mergedData` rather than at render time | `TagInput.onChange` emits `string[]`; `updateData` stores those raw IDs; `mergedData` resolves them via `allTags.find()` so `filteredData` always has full objects for name-based search |
| Functional `setState` | Passing a function `prev => newState` to `setState` instead of a value directly | `setPendingEdits(prev => ...)` avoids stale closure bugs when multiple `updateData` calls fire in rapid succession (e.g., typing fast) |
| `useCallback` for stable references | Wrapping functions so their identity is stable across renders unless dependencies change | All functions returned from `useEditableTable` are wrapped in `useCallback` so they don't cause unnecessary re-renders in tables that memoize `tableMeta` |

---

## What To Look At Next

- [src/hooks/useEditableTable.ts](src/hooks/useEditableTable.ts) — Start here. The hook is small and self-contained; reading it gives the complete mental model of how pending edits, merging, and tag normalization work.
- [src/components/tables/expenses/ExpenseTable.tsx](src/components/tables/expenses/ExpenseTable.tsx) — The canonical example of how a table wires to `useEditableTable`. The other two tables follow the exact same pattern; diffing this file against the pre-refactor version makes the removal of dual-state immediately visible.
- [src/hooks/useEditableTable.test.ts](src/hooks/useEditableTable.test.ts) — The unit tests enumerate every behavioral contract of the hook; reading them is faster than reading the implementation if you want to understand the guarantees the hook makes to its consumers.
