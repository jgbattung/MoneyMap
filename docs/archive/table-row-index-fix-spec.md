# Table Row Index Fix — Specification

## Overview

All three transaction tables (Expense, Income, Transfer) have a critical bug: when the table is filtered by search or date, editing a row corrupts the wrong entry in the local state because `row.index` refers to the filtered array position, not the position in the full `data` array.

## Root Cause

The tables use a two-layer data model:
1. `data` — full unfiltered array stored in `useState`, used by `updateData` and `revertData`
2. `filteredData` — a `useMemo` subset filtered by search term and date range
3. `useReactTable({ data: filteredData, ... })` — the table sees only the filtered subset

TanStack React Table assigns `row.index` based on the array passed to it — i.e., the index within `filteredData`. But `updateData`, `revertData`, `saveRow`, and `handleDeleteClick` all use `row.index` to index into the full `data` array:

```tsx
// updateData — uses row.index to find the row in full `data`
setData((old) => old.map((row, index) => {
  if (index === rowIndex) { ... }  // rowIndex = filtered position
}));

// saveRow — reads from table.options.data which IS filteredData, so this is correct
const updatedRow = table.options.data[row.index]; // ✓ reads from filteredData

// revertData — uses row.index to find in full `data` and `originalData`
old.map((row, index) => (index === rowIndex ? originalData[rowIndex] : row));
```

**The result:** `saveRow` reads the correct row (from `filteredData`), builds the correct API payload, and the server updates succeed. But `updateData` writes to the wrong position in `data`, so the local state diverges. On re-render, the edited row doesn't show the changes because the wrong row in `data` was modified.

Additionally, `revertData` reverts the wrong row from `originalData` when filtered.

## Affected Code Paths

All three tables have identical patterns. Using ExpenseTable line numbers as reference:

| Function | Line | Issue |
|----------|------|-------|
| `CellContent` → `onBlur` / `onSelectChange` / `onDateChange` | 48, 53, 56, 64, 165 | Calls `updateData(row.index, ...)` — filtered index |
| `TagsCell` → `onChange` | 229 | Calls `updateData(row.index, ...)` — filtered index |
| `updateData` | 522-534 | Uses positional index to find row in full `data` |
| `revertData` | 536-540 | Uses positional index to find row in full `data` and `originalData` |
| `saveRow` | 273 | `table.options.data[row.index]` — this is actually correct (reads from `filteredData`) |
| `handleDeleteClick` | 314 | `table.options.data[row.index]` — also correct (reads from `filteredData`) |
| `CellContent` subcategory | 130 | `table.options.data[row.index]` — correct (reads from `filteredData`) |

**Only `updateData` and `revertData` are broken** — they index into `data`/`originalData` by position instead of by ID.

## Fix Strategy

**Change `updateData` and `revertData` to find rows by ID instead of positional index.**

The approach: pass the row's `id` (from `row.original.id`) instead of `row.index` to `updateData` and `revertData`. Then match against `row.id` in the `data` array.

### updateData — before:
```tsx
const updateData = useCallback((rowIndex: number, columnId: string, value: any) => {
  setData((old) =>
    old.map((row, index) => {
      if (index === rowIndex) {
        return { ...old[rowIndex], [columnId]: value };
      }
      return row;
    })
  );
}, []);
```

### updateData — after:
```tsx
const updateData = useCallback((rowId: string, columnId: string, value: any) => {
  setData((old) =>
    old.map((row) => {
      if (row.id === rowId) {
        return { ...row, [columnId]: value };
      }
      return row;
    })
  );
}, []);
```

### revertData — before:
```tsx
const revertData = useCallback((rowIndex: number) => {
  setData((old) =>
    old.map((row, index) => (index === rowIndex ? originalData[rowIndex] : row))
  );
}, [originalData]);
```

### revertData — after:
```tsx
const revertData = useCallback((rowId: string) => {
  setData((old) =>
    old.map((row) => {
      if (row.id === rowId) {
        const original = originalData.find((o) => o.id === rowId);
        return original ?? row;
      }
      return row;
    })
  );
}, [originalData]);
```

### Callers — change `row.index` to `row.original.id`:

Every place that calls `meta?.updateData(row.index, ...)` becomes `meta?.updateData(row.original.id, ...)`.

Every place that calls `meta?.revertData(row.index)` becomes `meta?.revertData(row.original.id)`.

This is safe because:
- `row.original` always contains the full data object, which has an `id` field
- The `id` is globally unique (Prisma CUID), so matching by ID is unambiguous
- `table.options.data[row.index]` in `saveRow` and `handleDeleteClick` is already correct (it reads from `filteredData`, which is what the table sees) — these do NOT need to change

## Files Affected

- `src/components/tables/expenses/ExpenseTable.tsx`
- `src/components/tables/income/IncomeTable.tsx`
- `src/components/tables/transfers/TransferTable.tsx`

All three tables get the identical fix pattern.

## What NOT To Do

- Do not change `table.options.data[row.index]` in `saveRow` or `handleDeleteClick` — these correctly read from `filteredData` (which is what the table is configured with).
- Do not remove the `filteredData` pattern or switch to TanStack Table's built-in filtering — the current client-side filter + debounced search works well and is consistent across all tables.
- Do not change the `CellContent` subcategory lookup (`table.options.data[row.index]`) — it reads from the table's data (filteredData), which is correct.

## Verification

1. Search for a specific expense by type or name
2. Click edit on the filtered result
3. Add a tag (or change any field)
4. Click save — the row should update visually immediately
5. Refresh the page — the change should persist
6. Repeat for Income and Transfer tables
7. Test without any filter active — confirm nothing regressed
8. Test revert (click X to cancel edit) while filtered — should restore original values
