# Table Row Index Fix — Explained

> Generated from: docs/archive/table-row-index-fix-spec.md, docs/archive/table-row-index-fix-plan.xml, docs/archive/table-row-index-fix-verification.md
> Branch: fix/table-row-index-filtered-edit
> Date: 2026-03-18

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 4 |
| Files created | 3 (test files) |
| Files modified | 3 (table components) |
| Tests written | 3 test files, 694 total tests passing |
| Commits | 5 |
| Phases | 4 |

**In one sentence:** Fixed a data-corruption bug in all three transaction tables (Expenses, Income, Transfers) where editing a row while a search filter was active would silently update the wrong row in local state.

---

## What Was Built

Before this fix, Money Map’s transaction tables had a silent but serious bug: if you searched for a specific transaction and then edited it, the visual update after saving would show the wrong row changing. The server-side save was correct — the right record was always updated in the database — but the local state in the browser diverged, so the UI displayed stale or mismatched data until the page was refreshed.

The bug affected all three transaction tables (Expenses, Income, and Transfers) identically. The fix was applied uniformly across all three.

The root cause was a mismatch between two different index spaces: TanStack Table assigned `row.index` based on the filtered subset of data visible in the table, but the functions responsible for updating local state were using that filtered index to look up rows in the full, unfiltered data array. When no filter was active, these two index spaces coincidentally aligned and the bug was invisible. Under any filter, they diverged.

No changes were made to the API, database, or data-fetching layer. This was a purely client-side state management fix.

---

## Deep Dive

### Data Layer

No schema or API changes were made. The fix is entirely within the React component layer.

### API Layer

No API routes were created or modified. The `saveRow` path — which reads the edited row and sends it to the server — was already correct before this fix and was intentionally left untouched.

### State and Data Fetching Layer

No hooks were changed. The fix is internal to the table components themselves.

### UI Layer

All three table components share the same structural pattern. Understanding one explains all three.

#### The Two-Array Architecture

Each table component maintains parallel data structures in React state:

- `data` — the full, unfiltered array of transactions held in `useState`. This is the source of truth for local state.
- `originalData` — a snapshot of the data as it arrived from the server, used to restore a row when the user cancels an edit.
- `filteredData` — a `useMemo` derivative of `data`, narrowed by the current search term and date range.

TanStack Table is configured with `useReactTable({ data: filteredData, ... })`, so the table only ever sees `filteredData`. This means `row.index` inside any cell renderer is the position within `filteredData`, not within `data`.

#### The Bug: Two Different Index Spaces

The spec describes the root cause precisely. When a user is viewing a filtered table:

```
data (full array):               [ Groceries(exp-aaa), Netflix(exp-bbb), Transport(exp-ccc) ]
                                   index 0               index 1           index 2

filteredData (search=Netflix):   [ Netflix(exp-bbb) ]
                                   index 0  <- this is what row.index reports
```

With the old code, editing Netflix would call `updateData(0, ...)` — passing `row.index = 0`. The `updateData` function then iterated `data` and modified the row at position 0, which is Groceries. Netflix was never updated in local state. The save to the server succeeded (because `saveRow` correctly used `filteredData`), but the UI diverged until page refresh.

The same problem affected `revertData`: canceling an edit of Netflix would call `revertData(0)` and restore position 0 in `data` — restoring Groceries to its original value, while Netflix remained in its edited state.

#### The Fix: Identity-Based Lookup

The fix changes `updateData` and `revertData` to accept a row ID string (a Prisma CUID) instead of a positional index, then match rows by identity rather than position.

**updateData — before:** used `index === rowIndex` to find the target row in `data`.

**updateData — after:** uses `row.id === rowId` to find the target row in `data`. The parameter type changed from `number` to `string`.

**revertData — before:** used `originalData[rowIndex]` to retrieve the original value by position.

**revertData — after:** uses `originalData.find((o) => o.id === rowId)` to retrieve the original value by identity. The `?? row` fallback ensures that if no original is found (should not happen under normal operation), the row is left unchanged rather than becoming `undefined`.

Every call site that previously passed `row.index` now passes `row.original.id`. The `row.original` object is the raw data record for that row — it is always available in TanStack Table cell renderers and always contains the `id` field from the database.

#### What Was NOT Changed

The spec explicitly identifies two patterns that look similar to the bug but are actually correct:

- `table.options.data[row.index]` in `saveRow` and `handleDeleteClick` — these read from `table.options.data`, which is `filteredData`. Since `row.index` is the position within `filteredData`, this access is correct.
- `table.options.data[row.index]` in the subcategory lookup inside `CellContent` — same reasoning.

These were left untouched.

### Validation Layer

No Zod schemas were added or modified. The fix contains no validation logic.

---

## Data Flow

The most important user action: edit a row while a search filter is active, then save it.

```
1. User types "Netflix" in the search input
2. filteredData (useMemo) recomputes: [ Netflix(exp-bbb) ] -- one row, visible index 0
3. User clicks the edit button on the Netflix row
4. User changes a field value in the cell editor (e.g., updates the amount)
5. CellContent onBlur fires, calling tableMeta?.updateData(row.original.id, column.id, value)
   row.original.id is "exp-bbb", not row.index (which is 0)
6. updateData iterates the full data array and finds the row where row.id === "exp-bbb"
   this is data[1] (Netflix), not data[0] (Groceries)
7. setData produces a new array with Netflix updated at its correct position
8. User clicks save -- saveRow reads table.options.data[row.index] from filteredData
   still correct: filteredData[0] is Netflix
9. The mutation hook sends PATCH /api/expense-transactions/[id] with the correct payload
10. On success, TanStack Query invalidates the query and re-fetches from the server
11. UI re-renders with server-confirmed data
```

The cancel (revert) flow:

```
1. User clicks the X button in EditCell while Netflix row is in edit mode
2. removeRow calls meta?.revertData(row.original.id) -- passes "exp-bbb"
3. revertData iterates data and finds row.id === "exp-bbb"
4. Calls originalData.find((o) => o.id === "exp-bbb") to get the pre-edit snapshot
5. Replaces the current Netflix row with its original snapshot
6. Table re-renders showing Netflix original field values
```

---

## Files Changed

| File | Change Type | What Changed |
|------|------------|--|
|  | Modified |  and  signatures changed from  to ; all 6 call sites updated from  to  |
|  | Modified | Identical fix pattern applied |
|  | Modified | Identical fix pattern applied |
|  | Created | 393-line test file covering rendering, updateData regression, revertData regression, and search filter behavior |
|  | Created | 368-line test file with the same coverage for IncomeTable |
|  | Created | 382-line test file with the same coverage for TransferTable |
|  | Created | Archived specification document |
|  | Created | Archived execution plan |
|  | Created | Archived verification report |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|--------------|----------|
|  | ExpenseTable component | Renders all rows; renders empty state; search filters rows; clearing search restores all rows; ID uniqueness precondition; Netflix at data[1] becomes visible[0] under filter; Transport row ID is exp-ccc not exp-aaa |
|  | IncomeTable component | Same suite of rendering, filter, updateData regression, and revertData regression cases for income transactions |
|  | TransferTable component | Same suite for transfer transactions |

The tests are structured as regression guards. Each test in the  and  describe blocks includes a comment naming the exact old behavior it protects against. For example, the Netflix filter test notes: "row.index=0 would resolve to exp-aaa (Groceries) in the full data array — wrong." This means if  were ever mistakenly reintroduced, the test would fail and the comment would explain why.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| TanStack Table row.index | The position of a row within the array passed to useReactTable | Was incorrectly used as an index into the full data array; is only valid as an index into filteredData |
| TanStack Table row.original | The raw data object for a row as it exists in the array passed to the table | Used to access row.original.id, the stable Prisma CUID that uniquely identifies the record |
| useMemo for derived state | Computes a value only when its dependencies change | Used to derive filteredData from data plus the current search term and date range |
| useCallback for stable function references | Memoizes a function so it is not recreated on every render | Used for updateData and revertData to avoid unnecessary re-renders of cell components |
| TanStack Table meta | A custom object passed to useReactTable that is accessible inside cell renderers via table.options.meta | The mechanism by which cell renderers call updateData and revertData upward without owning state themselves |
| Identity-based vs position-based lookup | Finding a record by its unique ID rather than its array index | The core of the fix: data.find(r => r.id === rowId) instead of data[rowIndex] |
| Prisma CUID | A collision-resistant unique ID generated by Prisma for every record | The id field on every transaction; globally unique, so safe to use as a row identity key across array operations |

---

## What To Look At Next

- `src/components/tables/expenses/ExpenseTable.tsx` — Reading the full file end-to-end shows how `data`, `filteredData`, `originalData`, `editedRows`, and `meta` interact as a system. The `updateData` and `revertData` functions are defined near line 519; tracing upward through `CellContent` and `EditCell` cements the complete mental model.

- `src/components/tables/expenses/ExpenseTable.test.tsx` — The describe blocks are labeled with the exact regression they guard. Reading test comments alongside the production code is the fastest way to understand why the old code was wrong and why the new code is correct.

- `.agent/conventions/tech-stack.md` — The broader architecture document explains how TanStack Query (server state), `useState` (local table state), and the component hierarchy relate to each other across the whole app. This fix lives at the boundary between local optimistic state and the server-sourced query cache.
