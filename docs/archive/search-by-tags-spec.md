# Search by Tags -- Design Specification

## Overview

Tags were added in V1 as optional, reusable identifiers on transactions (expense, income, transfer). While tags are stored, displayed, and editable, the search and filter system does not yet leverage them. This spec adds two complementary capabilities:

1. **Free-text search includes tag names** -- Typing "Bangkok" in the search box matches transactions tagged "Bangkok," in addition to name/description/account/type matches.
2. **Explicit tag filter (multi-select)** -- A dedicated tag filter control lets users select one or more tags and see only transactions associated with those tags.

No database or schema changes are required. The Tag model, M2M join tables, and `include: { tags: true }` in GET responses are all already in place.

---

## Requirements

1. When a user types in the existing search input, the search must also match against tag names on transactions (case-insensitive partial match).
2. A new tag filter control must allow selecting one or more tags from the user's tag list.
3. Tag filtering uses **OR logic** -- a transaction is included if it has **at least one** of the selected tags.
4. Tag filters apply alongside existing search text and date filters (all filters are ANDed together).
5. Clearing all selected tags removes the tag filter (shows all transactions again).
6. The tag filter must work on all three transaction types: expenses, income, and transfers.
7. The tag filter must work on both mobile and desktop layouts.
8. The feature must not introduce any new dependencies.

---

## Architecture

### API Layer Changes

All three transaction GET routes currently accept `search`, `dateFilter`, and `accountId` as query parameters. Two changes are needed per route:

#### Change 1: Add tag names to the `search` OR clause

When the `search` parameter is provided, the existing `whereClause.OR` array is expanded with an additional condition that matches against related tag names:

```typescript
// Add to the existing OR array in each route:
{
  tags: {
    some: {
      name: {
        contains: search,
        mode: 'insensitive' as Prisma.QueryMode,
      },
    },
  },
},
```

This is a single additional entry in the existing OR array. No structural changes to the search logic are needed.

#### Change 2: Add `tagIds` query parameter

A new optional `tagIds` query parameter accepts a comma-separated string of tag IDs (e.g., `?tagIds=id1,id2,id3`). When provided, the route adds a filter condition:

```typescript
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

This uses Prisma's `some` operator with `in` to implement OR logic: a transaction matches if it has at least one tag whose ID is in the provided array.

**Important:** The `tagIds` filter is ANDed with all other existing filters (search text, date, accountId) because it is added as a top-level property on `whereClause`, not inside the `OR` array.

#### Affected API files

| File | Tag search addition | `tagIds` filter addition |
|------|-------------------|------------------------|
| `src/app/api/expense-transactions/route.ts` | Add tag name to `OR` array | Add `tagIds` param parsing + `whereClause.tags` |
| `src/app/api/income-transactions/route.ts` | Add tag name to `OR` array | Add `tagIds` param parsing + `whereClause.tags` |
| `src/app/api/transfer-transactions/route.ts` | Add tag name to `OR` array | Add `tagIds` param parsing + `whereClause.tags` |

### Hook Layer Changes

All three transaction query hooks (`useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useTransferTransactionsQuery`) need:

1. Add `tagIds?: string[]` to the options interface.
2. Pass `tagIds` as a comma-separated string in the fetch function's URL params: `params.append('tagIds', tagIds.join(','))`.
3. Include `tagIds` in the TanStack Query key object so cache is correctly keyed per filter combination.

#### Affected hook files

| File | Changes |
|------|---------|
| `src/hooks/useExpenseTransactionsQuery.ts` | Add `tagIds` to `UseExpenseTransactionsOptions`, `fetchExpenseTransactions`, and query key |
| `src/hooks/useIncomeTransactionsQuery.ts` | Add `tagIds` to `UseIncomeTransactionsOptions`, `fetchIncomeTransactions`, and query key |
| `src/hooks/useTransferTransactionsQuery.ts` | Add `tagIds` to `UseTransfersOptions`, `fetchTransfers`, and query key |

### Desktop Table Client-Side Filtering Changes

The desktop table components (`ExpenseTable`, `IncomeTable`, `TransferTable`) perform client-side filtering in a `filteredData` useMemo. Two additions are needed per table:

1. **Tag text search:** Add tag name matching to the client-side search filter logic inside `filteredData`, so typing in the table's search box also matches tag names:
   ```typescript
   row.tags?.some(tag => tag.name.toLowerCase().includes(searchLower))
   ```

2. **Tag ID filter:** Add a `selectedTagIds` state and filter logic. When `selectedTagIds` is non-empty, only include rows that have at least one matching tag:
   ```typescript
   if (selectedTagIds.length > 0) {
     const hasMatchingTag = row.tags?.some(tag => selectedTagIds.includes(tag.id));
     if (!hasMatchingTag) return false;
   }
   ```

3. **Tag filter UI:** Add the `TagFilter` component (see below) in the toolbar alongside the existing search input and date toggle.

#### Affected table files

| File | Changes |
|------|---------|
| `src/components/tables/expenses/ExpenseTable.tsx` | Add tag search in `filteredData`, add `selectedTagIds` state, add `TagFilter` in toolbar |
| `src/components/tables/income/IncomeTable.tsx` | Same |
| `src/components/tables/transfers/TransferTable.tsx` | Same |

### Mobile View Changes

The mobile pages and `TransactionsMobileView` use server-side filtering (params passed to hooks). They need:

1. Add `selectedTagIds` state per transaction type.
2. Pass `tagIds` to the respective hook calls.
3. Render the `TagFilter` component in the filter area (between the search input and the date toggle group).

#### Affected mobile files

| File | Changes |
|------|---------|
| `src/app/expenses/page.tsx` | Add `selectedTagIds` state, pass to hook, render `TagFilter` |
| `src/app/income/page.tsx` | Add `selectedTagIds` state, pass to hook, render `TagFilter` |
| `src/app/transfers/page.tsx` | Add `selectedTagIds` state, pass to hook, render `TagFilter` |
| `src/components/transactions/TransactionsMobileView.tsx` | Add `selectedTagIds` state per tab, pass to hooks, render `TagFilter` per tab |

---

## UI Design

### `TagFilter` Component

**Location:** `src/components/shared/TagFilter.tsx`

A reusable, controlled component for selecting tags to filter by.

```typescript
interface TagFilterProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}
```

**Layout:**

```
[Filter by tags v]                    <-- Trigger button (Popover trigger)
  +-------------------------------+
  | Search tags...                |   <-- Optional search within tag list
  |-------------------------------|
  | [x] Bangkok                   |   <-- Checkbox + colored dot + name
  | [ ] Food                      |
  | [x] Home Renovation           |
  | [ ] Shopping                   |
  +-------------------------------+

Selected: [Bangkok x] [Home Renovation x]   <-- Active filter pills shown below
```

**Trigger button:**
- Uses the existing Shadcn `Button` with `variant="outline"` and a tag icon (from `lucide-react`, e.g., `TagIcon` or `Tags`).
- Label: "Tags" when no tags are selected; "Tags (N)" when N tags are selected, where N is the count.
- Compact styling to sit alongside existing controls.

**Popover content:**
- Uses Shadcn `Popover` + `PopoverContent`.
- Inside: a `Command` (cmdk) component for searchable list of tags, or a simple scrollable list with `Checkbox` items if the tag count is small.
- Each item shows: a small colored dot (using the tag's HSL color), the tag name, and a Shadcn `Checkbox`.
- Clicking a tag toggles its selection.
- A "Clear all" link/button at the bottom when any tags are selected.
- Maximum height with overflow scroll for users with many tags.

**Active filter pills:**
- When tags are selected, display them as small `Badge` pills below the filter controls (or inline, depending on space).
- Each pill shows the tag name and an X button to deselect.
- Uses the same `Badge` component already used for tag display throughout the app.

**Behavior:**
- `onChange` is called with the updated array of selected tag IDs whenever a tag is toggled.
- The parent component stores the state and passes it to the transaction hook.
- When all tags are deselected, the filter is removed (empty array).

### Placement

**Desktop tables (all 3):**
- The `TagFilter` button sits in the toolbar row, between the date toggle group and the search input (right side).
- Active filter pills appear below the toolbar row if any tags are selected.

**Mobile pages (expenses, income, transfers) and `TransactionsMobileView`:**
- The `TagFilter` button sits between the search input and the date toggle group.
- Active filter pills appear below the tag filter button.

### Interaction Specification

| Action | Behavior |
|--------|----------|
| Click "Tags" button | Opens popover with tag list |
| Click a tag in popover | Toggles that tag's selection; results update immediately |
| Click X on an active pill | Deselects that tag; results update immediately |
| Click "Clear all" in popover | Deselects all tags; results update immediately |
| Type in popover search | Filters the tag list within the popover (does not affect transaction results) |
| Close popover | Selection persists; popover can be reopened |

---

## What NOT To Do

- **Do not use AND logic for tag filtering.** OR logic (any-match) is the standard expectation for tag filters in financial apps. AND logic narrows results too aggressively. It can be added as an opt-in toggle in a future iteration if needed.
- **Do not add `tagIds` to the URL as repeated params** (e.g., `?tagIds=a&tagIds=b`). Use a single comma-separated param (`?tagIds=a,b`) for simplicity and consistency with the existing param style.
- **Do not create a separate search API endpoint.** Extend the existing GET endpoints with the new parameter.
- **Do not install a multi-select or tag-filter library.** The project has `Popover`, `Command`, `Badge`, `Checkbox`, and `Button` from Shadcn -- everything needed.
- **Do not skip client-side tag filtering on desktop tables.** Desktop tables filter client-side; the tag filter must also be applied there.
- **Do not couple the TagFilter component to a specific transaction type.** It should be generic -- it receives the full tag list from `useTagsQuery` internally and exposes only `selectedTagIds` and `onChange`.
- **Do not modify the existing `TagInput` component.** `TagInput` is for form fields (assigning tags to transactions). `TagFilter` is for search/filter (selecting tags to filter results by). They have different UX purposes and should be separate components.

---

## Handoff Note for Builder

**Feature:** Search by Tags
**Branch name suggestion:** `feature/search-by-tags`
**Files most likely to be affected:**

- `src/app/api/expense-transactions/route.ts` -- Add tag name to search OR clause + add `tagIds` param
- `src/app/api/income-transactions/route.ts` -- Same
- `src/app/api/transfer-transactions/route.ts` -- Same
- `src/hooks/useExpenseTransactionsQuery.ts` -- Add `tagIds` to options, fetch, and query key
- `src/hooks/useIncomeTransactionsQuery.ts` -- Same
- `src/hooks/useTransferTransactionsQuery.ts` -- Same
- `src/components/shared/TagFilter.tsx` -- New component
- `src/components/tables/expenses/ExpenseTable.tsx` -- Add tag search + tag filter in toolbar + `selectedTagIds` state
- `src/components/tables/income/IncomeTable.tsx` -- Same
- `src/components/tables/transfers/TransferTable.tsx` -- Same
- `src/app/expenses/page.tsx` -- Add `selectedTagIds` state, pass to hook, render `TagFilter`
- `src/app/income/page.tsx` -- Same
- `src/app/transfers/page.tsx` -- Same
- `src/components/transactions/TransactionsMobileView.tsx` -- Add `selectedTagIds` per tab, pass to hooks, render `TagFilter`

**Watch out for:**

- The `transfer-transactions` GET route has a special `OR` handling for `accountId` that appends to the existing `whereClause.OR`. When adding `tagIds` filtering, make sure it does not conflict with the `accountId` OR logic -- `tagIds` should be a separate top-level `tags` condition on the where clause, not inside the OR.
- Desktop tables do ALL filtering client-side in the `filteredData` useMemo. The `tagIds` param is NOT passed to the hook on desktop -- instead, filtering is done locally. Only mobile views pass `tagIds` to the hook for server-side filtering.
- The `useTagsQuery` hook is already available and returns `tags: Tag[]`. The `TagFilter` component should call it internally to get the tag list.
- The `Checkbox` component from Shadcn (`src/components/ui/checkbox.tsx`) should be used for tag selection in the popover. Verify it exists; if not, generate it with `npx shadcn@latest add checkbox`.
- When no tags exist for the user, the `TagFilter` button should either be hidden or show a disabled state with a tooltip like "No tags created yet."
- Reset `displayCount` / pagination when tag filter changes, the same way the codebase already resets it when `search` or `dateFilter` changes.

**Verification focus:**

- Search "Bangkok" in the search input -- should find transactions tagged "Bangkok" even if "Bangkok" is not in the transaction name or description
- Select a tag in the tag filter -- only transactions with that tag appear
- Select multiple tags -- transactions with ANY of the selected tags appear (OR logic)
- Combine tag filter + date filter + text search -- all three should AND together correctly
- Remove a tag pill -- results update immediately
- Clear all tags -- shows all transactions again
- Verify on both mobile and desktop layouts
- `npm run build` must pass with no TypeScript errors
- `npm run lint` must pass
