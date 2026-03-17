# Table Row Index Fix — Verification

## Status
All 4 tasks completed and committed.

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Change ExpenseTable updateData and revertData to use row ID instead of positional index | 473492e | ✓ Done |
| 2 | Change IncomeTable updateData and revertData to use row ID instead of positional index | 27c13e4 | ✓ Done |
| 3 | Change TransferTable updateData and revertData to use row ID instead of positional index | ef623a7 | ✓ Done |
| 4 | Run lint, build, and test suite | — | ✓ Done |

## Verification Steps

### Build (per-task)
Each task was verified with `npm run build` immediately after the change. All three builds produced zero TypeScript errors.

### Lint
```
npm run lint
✔ No ESLint warnings or errors
```

### Build (final)
`npm run build` — passed with zero errors.

### Tests
```
npx vitest run
Test Files: 43 passed (43)
      Tests: 694 passed (694)
```

## Changes Made

In all three tables (`ExpenseTable`, `IncomeTable`, `TransferTable`):

- **`updateData`**: Parameter changed from `rowIndex: number` to `rowId: string`. Row lookup changed from positional `index === rowIndex` to identity `row.id === rowId`.
- **`revertData`**: Parameter changed from `rowIndex: number` to `rowId: string`. Original row lookup changed from `originalData[rowIndex]` to `originalData.find((o) => o.id === rowId)`.
- **All callers** of `updateData` and `revertData` in `CellContent`, `TagsCell`, and `EditCell`: changed from `row.index` to `row.original.id`.
- **Not changed**: `table.options.data[row.index]` in `saveRow`, `handleDeleteClick`, and the subcategory lookup — these read from `filteredData` (the table's configured data), which is correct.

## Notes

No deviations from the spec. The fix is purely a lookup-strategy change — no API contracts, data shapes, or rendering logic were altered.
