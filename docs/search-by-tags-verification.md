# Search by Tags — Verification

## Status
All 15 tasks completed and committed on branch `feature/search-by-tags`.

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Add tag name to expense-transactions search OR clause | `928eafd` | ✓ Done |
| 2 | Add tag name to income-transactions search OR clause | `406c5c7` | ✓ Done |
| 3 | Add tag name to transfer-transactions search OR clause | `f3eee9c` | ✓ Done |
| 4 | Add tagIds param to useExpenseTransactionsQuery hook | `746d765` | ✓ Done |
| 5 | Add tagIds param to useIncomeTransactionsQuery hook | `d7f1af5` | ✓ Done |
| 6 | Add tagIds param to useTransferTransactionsQuery hook | `49c9f52` | ✓ Done |
| 7 | Create TagFilter shared component | `95eb970` | ✓ Done |
| 8 | Add tag filtering to ExpenseTable | `bcfbf20` | ✓ Done |
| 9 | Add tag filtering to IncomeTable | `dad04ad` | ✓ Done |
| 10 | Add tag filtering to TransferTable | `19f643d` | ✓ Done |
| 11 | Add tag filter to expenses page (mobile) | `b2999bb` | ✓ Done |
| 12 | Add tag filter to income page (mobile) | `63976a8` | ✓ Done |
| 13 | Add tag filter to transfers page (mobile) | `e72df65` | ✓ Done |
| 14 | Add tag filter to TransactionsMobileView | `1a5ebc5` | ✓ Done |
| 15 | Lint + build pass; create verification doc | — | ✓ Done |

## Build & Lint Results

```
npm run lint   → ✔ No ESLint warnings or errors
npm run build  → ✓ Compiled successfully (zero TypeScript or Next.js errors)
```

## Files Created or Modified

### New Files
- `src/components/shared/TagFilter.tsx` — Popover multi-select tag filter component with search, checkboxes, clear-all, and filter pills

### Modified API Routes
- `src/app/api/expense-transactions/route.ts` — tag name added to search OR; `tagIds` param parsed and applied as `whereClause.tags`
- `src/app/api/income-transactions/route.ts` — same
- `src/app/api/transfer-transactions/route.ts` — same (tagIds placed top-level, outside the accountId OR array)

### Modified Hooks
- `src/hooks/useExpenseTransactionsQuery.ts` — added `tagIds?: string[]` to options interface, query key, and fetch params
- `src/hooks/useIncomeTransactionsQuery.ts` — same
- `src/hooks/useTransferTransactionsQuery.ts` — same

### Modified Desktop Tables
- `src/components/tables/expenses/ExpenseTable.tsx` — `TagFilter` added to toolbar; tag ID and name filtering in `filteredData` useMemo
- `src/components/tables/income/IncomeTable.tsx` — same
- `src/components/tables/transfers/TransferTable.tsx` — same

### Modified Pages (mobile views)
- `src/app/expenses/page.tsx` — `TagFilter` added; `selectedTagIds` state wired to hook and `isFiltering`
- `src/app/income/page.tsx` — same
- `src/app/transfers/page.tsx` — same
- `src/components/transactions/TransactionsMobileView.tsx` — `TagFilter` added to all three tabs (expenses, income, transfers) with independent state per tab

## Manual Verification Steps

### 1. Text search matches tag names
- Navigate to `/expenses` (mobile) or use the ExpenseTable (desktop)
- Type the name of a tag in the search box
- Verify that transactions tagged with that tag name appear in results

### 2. TagFilter popover opens and lists tags
- Click the "Tags" button
- Verify a popover opens listing all created tags with checkboxes
- Type in the search box inside the popover to filter tag names

### 3. Tag selection applies OR filter
- Select two tags in TagFilter
- Verify transactions tagged with **either** tag appear (OR logic, not AND)
- Badge pills appear below the button showing each selected tag

### 4. Clear all removes filter
- With tags selected, click "Clear all" inside the popover
- Verify all transactions are shown again
- Badge pills disappear

### 5. Remove individual filter pill
- Select multiple tags
- Click the ✕ on one badge pill
- Verify only that tag is deselected; others remain active

### 6. Combined filters work correctly
- Set a date filter (e.g. "This Month") and select a tag
- Verify only transactions within that month AND matching the tag are shown

### 7. Tag filter resets display count (mobile)
- On mobile with many transactions, scroll past 15
- Change the tag filter selection
- Verify list resets to first 15 items

### 8. Desktop tables filter client-side
- On desktop, select tags in the toolbar TagFilter
- Verify filtering happens instantly without a network request
- Tag name text search also works in the main search input

### 9. No tags disabled state
- If a user has no tags created, the TagFilter button should be disabled with tooltip "No tags created yet"

### 10. TransactionsMobileView tab independence
- On `/transactions` (mobile), switch between Expenses / Income / Transfers tabs
- Verify each tab maintains its own independent tag filter state

## Notes
- Desktop tables perform all filtering client-side in `filteredData` useMemo — `tagIds` is not passed to the server hook for table components.
- Mobile pages pass `tagIds` server-side via the query hook (comma-separated in URL: `?tagIds=id1,id2`).
- Transfer API route uses top-level `whereClause.tags` for the tag filter rather than nesting inside the `accountId` OR array, to avoid conflating account filtering with tag filtering.
- No database schema changes were required — tags were already a many-to-many relation on all transaction models.
