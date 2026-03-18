# Search Tags Cleanup Spec

> Remove the `TagFilter` component and all tag-ID-based filtering infrastructure. Keep the existing tag-name text search behavior that is already wired into the unified search bar.

## Background

The search-by-tags feature was recently added with two parallel mechanisms:

1. **TagFilter component** -- a popover with checkboxes that filters transactions by tag IDs (client-side on desktop tables, server-side on mobile/page views).
2. **Tag-name text search** -- the existing search bar already matches against `tag.name` in both the API route `search` param handler and the desktop table `filteredData` useMemo.

After testing, the TagFilter approach introduced several issues:

- **Hydration error** -- `TagFilter.tsx` wraps a Shadcn `<Checkbox>` (renders as `<button>`) inside an outer `<button>`, producing a `<button>` inside `<button>` DOM nesting that React flags during hydration.
- **Redundant UX** -- Users can already find transactions by tag name via the search bar, making the separate filter popover unnecessary clutter.
- **Extra state complexity** -- `selectedTagIds` state, `tagIds` query params, and `useEffect`s for resetting display counts add complexity without proportional value.

The user has decided to remove TagFilter entirely and rely solely on tag-name text search.

## Scope

### In scope

1. Delete `src/components/shared/TagFilter.tsx` and `src/components/shared/TagFilter.test.tsx`.
2. Remove all imports and usages of `TagFilter` from consumer components.
3. Remove `selectedTagIds` state variables and related `useEffect`s from all consumer components.
4. Remove `tagIds` from the `isFiltering` / `isExpenseFiltering` / `isIncomeFiltering` / `isTransferFiltering` flags so they only check `search` and `dateFilter`.
5. Remove `tagIds` query parameter parsing and `whereClause.tags` assignment from the three API route GET handlers.
6. Remove `tagIds` from the three transaction query hooks (option interface, fetch function params, `params.append`, and TanStack Query key).
7. Remove `tagIds` option from hook call sites in consumer components.
8. Remove TagFilter-related tests from table and mobile view test files (mock declarations, describe blocks for tag filter).
9. Clean up unused imports resulting from the above removals.

### Out of scope

- Table pagination reset bug (separate task).
- Any new UI additions.
- The tag-name text search in `filteredData` useMemo and API route `search` handler -- **keep as-is**.
- The `tagIds` field on the Zod creation/update schemas in the API routes -- these are for **creating/updating** transactions with tags, not for filtering. **Keep as-is**.
- The `tagIds` field used in the `saveRow` / `EditCell` update payloads in the desktop tables -- these send tag IDs when saving inline edits. **Keep as-is**.

## Affected Files

### Files to DELETE

| File | Reason |
|------|--------|
| `src/components/shared/TagFilter.tsx` | Component being removed |
| `src/components/shared/TagFilter.test.tsx` | Tests for removed component |

### Files to MODIFY

| File | Changes |
|------|---------|
| `src/components/tables/expenses/ExpenseTable.tsx` | Remove `TagFilter` import, `selectedTagIds` state, tag-ID filter block in `filteredData`, `selectedTagIds` from useMemo deps, `TagFilter` JSX, and `useTagsQuery` import if unused elsewhere in file |
| `src/components/tables/income/IncomeTable.tsx` | Same as ExpenseTable |
| `src/components/tables/transfers/TransferTable.tsx` | Same as ExpenseTable |
| `src/components/transactions/TransactionsMobileView.tsx` | Remove `TagFilter` import, three `*SelectedTagIds` state vars, three `useEffect`s that reset display count on tag change, `tagIds` from hook calls, `TagFilter` JSX (x3), `*SelectedTagIds.length > 0` from `isFiltering` flags |
| `src/app/expenses/page.tsx` | Remove `TagFilter` import, `selectedTagIds` state, `useEffect` for tag reset, `tagIds` from hook call, `TagFilter` JSX, `selectedTagIds.length > 0` from `isFiltering` |
| `src/app/income/page.tsx` | Same as expenses page |
| `src/app/transfers/page.tsx` | Same as expenses page |
| `src/hooks/useExpenseTransactionsQuery.ts` | Remove `tagIds` from `UseExpenseTransactionsOptions`, `fetchExpenseTransactions` params, `params.append` line, and query key object |
| `src/hooks/useIncomeTransactionsQuery.ts` | Same as expense hook |
| `src/hooks/useTransferTransactionsQuery.ts` | Same as expense hook |
| `src/app/api/expense-transactions/route.ts` | Remove `tagIds` query param parsing and `whereClause.tags` block in GET handler |
| `src/app/api/income-transactions/route.ts` | Same as expense API route |
| `src/app/api/transfer-transactions/route.ts` | Same as expense API route |
| `src/components/tables/expenses/ExpenseTable.test.tsx` | Remove TagFilter mock, tag-filter describe blocks |
| `src/components/tables/income/IncomeTable.test.tsx` | Same |
| `src/components/tables/transfers/TransferTable.test.tsx` | Same |
| `src/components/transactions/TransactionsMobileView.test.tsx` | Remove TagFilter mock, all tag-filter-related describe blocks and test cases |

## Implementation Details

### 1. Desktop Tables (ExpenseTable, IncomeTable, TransferTable)

**Remove:**
- `import { TagFilter } from '@/components/shared/TagFilter';`
- `const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);`
- The tag-ID filter block inside `filteredData` useMemo:
  ```ts
  // Tag ID filter
  if (selectedTagIds.length > 0) {
    const hasMatchingTag = row.tags?.some(tag => selectedTagIds.includes(tag.id));
    if (!hasMatchingTag) return false;
  }
  ```
- `selectedTagIds` from the `filteredData` useMemo dependency array.
- The `<TagFilter>` JSX in the toolbar area.

**Keep:**
- The tag-name text search line inside the search filter section of `filteredData`:
  ```ts
  row.tags?.some(tag => tag.name.toLowerCase().includes(searchLower))
  ```
- The `TagsCell` component and `TagInput` import (used for inline editing).
- The `useTagsQuery` import in `ExpenseTable.tsx` (used by `TagsCell`). Check IncomeTable and TransferTable -- if `useTagsQuery` is only imported for `TagFilter`, it may already be used by `TagsCell` internally. Verify before removing.

### 2. Mobile View (TransactionsMobileView)

**Remove:**
- `import { TagFilter } from '@/components/shared/TagFilter';`
- Three state variables: `expenseSelectedTagIds`, `incomeSelectedTagIds`, `transferSelectedTagIds` and their setters.
- Three `useEffect`s that reset display count when tag IDs change (lines 138-140 in current file).
- `tagIds: expenseSelectedTagIds` from `useExpenseTransactionsQuery` call.
- `tagIds: incomeSelectedTagIds` from `useIncomeTransactionsQuery` call.
- `tagIds: transferSelectedTagIds` from `useTransfersQuery` call.
- Three `<TagFilter>` JSX elements (one per tab).
- `expenseSelectedTagIds.length > 0` from `isExpenseFiltering`.
- `incomeSelectedTagIds.length > 0` from `isIncomeFiltering`.
- `transferSelectedTagIds.length > 0` from `isTransferFiltering`.

### 3. Mobile Page Files (expenses/page, income/page, transfers/page)

**Remove:**
- `import { TagFilter } from '@/components/shared/TagFilter';`
- `const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);`
- `useEffect(() => { setDisplayCount(ITEMS_PER_LOAD); }, [selectedTagIds]);`
- `tagIds: selectedTagIds` from the hook call.
- `<TagFilter>` JSX.
- `selectedTagIds.length > 0` from `isFiltering`.

### 4. Hooks

For each of the three hooks (`useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useTransferTransactionsQuery`):

**Remove from options interface:**
```ts
tagIds?: string[];
```

**Remove from fetch function signature:**
```ts
tagIds?: string[]  // last parameter
```

**Remove from fetch function body:**
```ts
if (tagIds && tagIds.length > 0) params.append('tagIds', tagIds.join(','));
```

**Remove from hook destructure:**
```ts
const { skip, take, search, dateFilter, accountId, tagIds } = options;
// becomes:
const { skip, take, search, dateFilter, accountId } = options;
```

**Remove from query key and queryFn:**
```ts
queryKey: [...QUERY_KEYS.xxx, { skip, take, search, dateFilter, accountId, tagIds }],
queryFn: () => fetchXxx(skip, take, search, dateFilter, accountId, tagIds),
// becomes:
queryKey: [...QUERY_KEYS.xxx, { skip, take, search, dateFilter, accountId }],
queryFn: () => fetchXxx(skip, take, search, dateFilter, accountId),
```

### 5. API Routes

For each of the three API route GET handlers:

**Remove this block:**
```ts
const tagIds = searchParams.get('tagIds');
if (tagIds) {
  const tagIdArray = tagIds.split(',').filter(Boolean);
  if (tagIdArray.length > 0) {
    whereClause.tags = {
      some: {
        id: { in: tagIdArray },
      },
    };
  }
}
```

**Keep** the `tagIds` field in the Zod schema and the POST handler `tags: { connect: ... }` logic -- those are for creating/updating transactions, not for filtering.

**Keep** the tag-name search in the `search` parameter handling (the OR clause that matches `tags.some.name.contains`).

### 6. Test Files

**ExpenseTable.test.tsx, IncomeTable.test.tsx, TransferTable.test.tsx:**
- Remove the `vi.mock('@/components/shared/TagFilter', ...)` block.
- Remove the `describe('tag filter ...')` block and all its child tests.

**TransactionsMobileView.test.tsx:**
- Remove the `vi.mock('@/components/shared/TagFilter', ...)` block.
- Remove all tag-filter-related describe blocks: "TagFilter integration", "tab independence -- tag filter state", "hook wiring -- tagIds".
- Remove individual `it` tests that reference TagFilter rendering.

## Verification Plan

After all changes:

1. **Lint** -- `npm run lint` passes with zero errors.
2. **Build** -- `npm run build` succeeds with zero errors.
3. **Tests** -- `npx vitest run` passes. No test references TagFilter or tagIds (except in creation/update contexts).
4. **Manual smoke test** -- On all three transaction pages (expenses, income, transfers):
   - The search bar still matches transactions by tag name.
   - No hydration errors in the browser console.
   - The TagFilter popover no longer appears.
   - Date filter and search still work correctly.
   - "Load More" button appears correctly when not filtering.

---

## Handoff Note

**Builder:** This is a pure removal/cleanup task. No new code is being added. Work through the plan phases in order. Each task is scoped to a specific layer (hooks, API, components, tests) to keep commits atomic and reviewable.

Key things to watch for:
- **Do NOT remove** `useTagsQuery` imports from table files if `TagsCell` (defined in the same file) uses it. Check each file individually.
- **Do NOT remove** the `tagIds` field from Zod schemas or POST/PATCH handlers -- those are for creating/updating transactions with tags.
- **Do NOT remove** the tag-name search lines in `filteredData` useMemo or in API route `search` handlers.
- **Do NOT touch** pagination logic (out of scope).
- After removing `selectedTagIds` from useMemo dependency arrays, verify the remaining deps are correct.
