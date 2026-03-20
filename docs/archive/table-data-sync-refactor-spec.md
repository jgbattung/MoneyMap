# Table Data Sync Refactor — Specification

## Objective

Eliminate the dual-state architecture (React Query cache + local `useState` copy) in all three transaction tables, replacing it with a single-source-of-truth model where React Query data flows directly into TanStack Table, and in-flight edits are tracked via a lightweight `pendingEdits` map.

This fixes two bugs:

1. **Pagination resets on inline edit** — editing a cell mutates local `data` state, which recomputes `filteredData` with a new array reference, causing TanStack Table to reset pagination to page 1.
2. **Stale data after save (tags not searchable)** — the sync `useEffect` only detects changes by array length and ID order, so content-only changes (like tag edits) never propagate from the refetched server data into local state. Tags remain as string IDs in local state, breaking tag-name search.

## Scope

### In scope

- Remove `data` / `originalData` / `prevTransactionsRef` local state and the sync `useEffect` from all three tables
- Create a shared `useEditableTable` hook encapsulating: `pendingEdits` map, `updateData`, `revertData`, `mergedData` computation, and `autoResetPageIndex` management
- Wire all three tables to the new hook
- Normalize tags in the merge step so `filteredData` always operates on full `{ id, name, color }` objects
- Add `autoResetPageIndex: false` to all three `useReactTable` configs with an empty-page safety clamp

### Out of scope

- Sorting (`getSortedRowModel`)
- Migrating filtering from `useMemo` to TanStack Table's `getFilteredRowModel()`
- API or schema changes
- UI/visual changes
- Server-side filtering changes

## Architecture

### Current flow (broken)

```
React Query → useEffect sync (shallow check) → useState(data) → useMemo(filteredData) → useReactTable
                                                     ↑
                                              updateData() writes here
```

**Problems:**
- `updateData()` mutates `data` state → new `filteredData` array ref → pagination reset
- Shallow sync check misses content changes → stale local state after save

### New flow (proposed)

```
React Query data ──────────────────┐
                                   ├──→ useMemo(mergedData) → useMemo(filteredData) → useReactTable
pendingEdits (Record<id, Partial>) ┘                                                    ↑
       ↑                                                                     autoResetPageIndex: false
  updateData() writes here
  revertData() deletes from here
  saveRow() clears entry on success
```

**How it works:**
1. `mergedData` = `queryData.map(row => pendingEdits[row.id] ? { ...row, ...pendingEdits[row.id] } : row)`
2. Tag normalization happens inside the merge: if `pendingEdits[row.id].tags` is `string[]`, resolve to full objects via `useTagsQuery` cache
3. `filteredData` operates on `mergedData` (always has full tag objects)
4. `autoResetPageIndex: false` prevents pagination jumps when `mergedData` reference changes
5. On save success, the mutation invalidates queries → React Query refetches → fresh data flows directly into the table (no sync `useEffect` needed)
6. On cancel, `revertData(rowId)` simply deletes `pendingEdits[rowId]` — the original server data is still in the React Query cache

### Empty-page safety

When `autoResetPageIndex: false`, the user could land on an empty page if rows are deleted or filtered away. The hook must clamp `pageIndex` to the last valid page when `pageIndex >= pageCount`.

## Shared Hook: `useEditableTable<T>`

**File:** `src/hooks/useEditableTable.ts`

### Interface

```ts
interface UseEditableTableOptions<T extends { id: string }> {
  queryData: T[];                          // Server data from React Query
  allTags?: { id: string; name: string; color: string }[];  // For tag normalization
}

interface UseEditableTableReturn<T> {
  mergedData: T[];                         // queryData + pendingEdits overlay
  editedRows: Record<string, boolean>;     // Which rows are in edit mode
  setEditedRows: Dispatch<SetStateAction<Record<string, boolean>>>;
  updateData: (rowId: string, columnId: string, value: any) => void;
  revertData: (rowId: string) => void;
  clearPendingEdits: (rowId: string) => void;  // Called after successful save
  hasPendingEdit: (rowId: string) => boolean;
}
```

### Key behaviors

1. **`updateData(rowId, columnId, value)`** — sets `pendingEdits[rowId][columnId] = value`
2. **`revertData(rowId)`** — deletes `pendingEdits[rowId]` entirely, restoring the row to server state
3. **`clearPendingEdits(rowId)`** — same as revert, called after successful save so the fresh server data takes over
4. **`mergedData`** — memoized merge of `queryData` with `pendingEdits`. Tag normalization included: if `pendingEdits[row.id].tags` is `string[]`, resolve each ID via `allTags.find()`
5. **`editedRows` / `setEditedRows`** — unchanged from current behavior (tracks which rows show edit UI)

## Changes Per Table

### ExpenseTable.tsx

**Remove:**
- `useState<ExpenseTransaction[]>([])` for `data` (line 366)
- `useState<ExpenseTransaction[]>([])` for `originalData` (line 367)
- `useRef<ExpenseTransaction[]>([])` for `prevTransactionsRef` (line 375)
- The sync `useEffect` (lines 377-388)
- `updateData` useCallback (lines 523-532)
- `revertData` useCallback (lines 534-544)

**Add:**
- Import and call `useEditableTable({ queryData: expenseTransactions, allTags: tags })`
- Destructure `mergedData`, `editedRows`, `setEditedRows`, `updateData`, `revertData`, `clearPendingEdits`

**Modify:**
- `filteredData` useMemo: change dependency from `data` to `mergedData`
- `useReactTable`: add `autoResetPageIndex: false`
- `tableMeta`: replace local `updateData`/`revertData` with hook versions, add `clearPendingEdits`
- `EditCell.saveRow()`: after successful mutation, call `meta.clearPendingEdits(row.original.id)` instead of relying on the sync `useEffect`
- `EditCell.removeRow()`: call `meta.revertData(row.original.id)` (same API, new implementation)
- Remove `typeof tag === 'object'` guard from `filteredData` search — `mergedData` guarantees full objects

### IncomeTable.tsx

Same pattern as ExpenseTable. Key differences:
- Uses `incomeTransactions` from `useIncomeTransactionsQuery`
- `saveRow` payload includes `incomeTypeId` instead of `expenseTypeId` / `expenseSubcategoryId`
- No installment fields

### TransferTable.tsx

Same pattern as ExpenseTable. Key differences:
- Uses `transfers` from `useTransfersQuery`
- `saveRow` payload includes `fromAccountId`, `toAccountId`, `transferTypeId`, `notes`, `feeAmount`
- No installment fields, no `description` (uses `notes`)

## Tag Normalization Detail

Currently, `TagInput.onChange` emits `string[]` (tag IDs). The `updateData` function stores these raw IDs in local state. `TagsCell` normalizes at render time. `filteredData` has a `typeof tag === 'object'` guard to prevent crashes.

After refactor:
- `updateData` stores raw IDs in `pendingEdits[rowId].tags = string[]` (no change)
- `mergedData` normalization resolves IDs to full objects: `pendingEdits[rowId].tags.map(id => allTags.find(t => t.id === id)).filter(Boolean)`
- `TagsCell` normalization remains as a safety net but should never encounter string IDs
- `filteredData` `typeof tag === 'object'` guard can be removed (always objects now)

## Verification Plan

For each table (Expense, Income, Transfer):

1. **Inline edit on page 2+** — navigate to page 2, edit a cell, confirm pagination does NOT reset to page 1
2. **Tag edit and search** — add a tag to a transaction, save, then search for that tag name — it should appear immediately without refresh
3. **Cancel edit** — edit a cell, click cancel, confirm the cell reverts to original server data
4. **Save and refetch** — edit a field, save, confirm the table shows the fresh server data (not stale local state)
5. **Delete on page 2+** — delete a row on the last page, confirm pagination clamps to the last valid page (no empty page)
6. **Multiple concurrent edits** — edit two different rows simultaneously, save one, confirm the other retains its pending changes
7. **Lint and build pass** — `npm run lint` and `npm run build` produce zero errors

---

## Handoff Note for Builder

**Feature:** Table Data Sync Refactor
**Branch name suggestion:** `refactor/table-data-sync`
**Files most likely to be affected:**
- `src/hooks/useEditableTable.ts` (new file)
- `src/components/tables/expenses/ExpenseTable.tsx`
- `src/components/tables/income/IncomeTable.tsx`
- `src/components/tables/transfers/TransferTable.tsx`

**Watch out for:**
- The `saveRow` function in `EditCell` accesses the updated row via `table.options.data[row.index]`. After the refactor, `table.options.data` is `filteredData` (derived from `mergedData`). The row index from TanStack Table's paginated view corresponds to the current page's rows, not the full data array. This is the existing behavior and should continue to work, but verify it.
- `TagInput` uses optimistic IDs (`optimistic-${Date.now()}`). The merge step must handle these gracefully — `allTags.find()` will return `undefined` for optimistic IDs, but `filter(Boolean)` handles this. The optimistic tag will appear once the real ID swaps in.
- The `editedRows` state (`Record<string, boolean>`) uses TanStack Table row IDs (e.g., `"0"`, `"1"`), not transaction IDs. This is separate from `pendingEdits` which uses transaction IDs. Don't confuse the two.
- The `handleDeleteConfirm` functions call `setEditedRows({})` to clear all edit states. After refactor, they should also clear all `pendingEdits` for the deleted row (though it will be removed from `queryData` on refetch anyway).

**Verification focus:**
- Pagination stability on edit and on save
- Tag search working immediately after save (no refresh needed)
- Cancel correctly reverting to server data
- No regressions in inline editing workflow