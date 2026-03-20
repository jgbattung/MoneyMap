# Load More Skeleton Pagination — Specification

## Objective

Fix the "Load More" button behavior across all transaction list views so that:

1. **Previously loaded items remain visible** while new data is fetched (no flash/full reload).
2. **Skeleton cards appear below existing items** during next-page fetches, replacing the Load More button temporarily.
3. **Initial page loads** show skeleton cards instead of a full-page spinner.
4. Each page uses a **skeleton component matching its own card type**.

## Scope

### In Scope

- Fixing the `placeholderData: keepPreviousData` pattern in 3 transaction query hooks
- Creating 4 skeleton card components (one per card type)
- Updating loading state rendering in 4 page components
- Updating existing hook tests to cover new return values

### Out of Scope

- Migrating to `useInfiniteQuery` / cursor-based pagination
- Changing the API routes or Prisma queries
- Desktop table views (they already have `SkeletonTable` / `SkeletonTransferTable`)
- Infinite scroll / intersection observer

---

## Root Cause

The current hooks use TanStack Query's `useQuery` with `skip` and `take` in the query key. When the user clicks "Load More", `displayCount` increases (e.g., from 15 to 30), which changes the `take` value and creates a **new query key**. TanStack Query treats this as a brand-new query with no cached data, so `isPending` becomes `true` and the entire list is replaced by a loading spinner until the re-fetch completes.

## Solution

Add `placeholderData: keepPreviousData` (from `@tanstack/react-query`) to each hook's `useQuery` call. This tells TanStack Query to keep showing the previous page's data while fetching the next page, preventing any flash. The hooks then expose two distinct loading states:

- `isLoading` (true only on the very first load when there is no data at all) — used for initial skeleton rendering
- `isFetchingMore` (true when fetching a new page while previous data is still displayed) — used for the inline skeleton cards below existing items

---

## Design: Skeleton Components

All skeletons use the existing `Skeleton` component from `src/components/ui/skeleton.tsx` and follow the established convention of `bg-secondary-500` for skeleton bar colors.

### 1. SkeletonExpenseCard

**Mirrors:** `ExpenseCard` (`src/components/shared/ExpenseCard.tsx`)

**Card container:** `money-map-card` class (non-interactive variant), `flex flex-col gap-3`

**Structure:**
```
Row 1: [icon placeholder 36x36 rounded-lg] [title bar h-5 w-[160px]]
Row 2: [category bar h-3 w-[120px]]
Row 3: [date bar h-3 w-[100px]] .......... [amount bar h-5 w-[80px] + account bar h-3 w-[60px] right-aligned]
```

**Skeleton elements (5 total):**
- Icon: `h-9 w-9 rounded-lg`
- Name: `h-5 w-[160px]`
- Category: `h-3 w-[120px]`
- Date: `h-3 w-[100px]`
- Amount: `h-5 w-[80px]`

**File:** `src/components/shared/SkeletonExpenseCard.tsx`

### 2. SkeletonIncomeCard

**Mirrors:** `IncomeCard` (`src/components/shared/IncomeCard.tsx`)

**Card container:** `money-map-card` class, `flex flex-col gap-3`

**Structure:**
```
Row 1: [icon placeholder 36x36 rounded-lg] [title bar h-5 w-[160px]]
Row 2: [income type bar h-3 w-[100px]]
Row 3: [date bar h-3 w-[100px]] .......... [amount bar h-5 w-[80px] + account bar h-3 w-[60px] right-aligned]
```

**Skeleton elements (5 total):**
- Icon: `h-9 w-9 rounded-lg`
- Name: `h-5 w-[160px]`
- Income type: `h-3 w-[100px]`
- Date: `h-3 w-[100px]`
- Amount: `h-5 w-[80px]`

**File:** `src/components/shared/SkeletonIncomeCard.tsx`

### 3. SkeletonTransferCard

**Mirrors:** `TransferCard` (`src/components/shared/TransferCard.tsx`)

**Card container:** `money-map-card` class, `flex flex-col gap-3`

**Structure:**
```
Row 1: [icon placeholder 36x36 rounded-lg] [title bar h-5 w-[160px]]
Row 2: [transfer type bar h-3 w-[100px]]
Row 3: [date bar h-3 w-[100px]]
Row 4 (right-aligned): [amount bar h-5 w-[80px]] + [accounts bar h-3 w-[120px]]
```

**Skeleton elements (5 total):**
- Icon: `h-9 w-9 rounded-lg`
- Name: `h-5 w-[160px]`
- Transfer type: `h-3 w-[100px]`
- Date: `h-3 w-[100px]`
- Amount: `h-5 w-[80px]`

**File:** `src/components/shared/SkeletonTransferCard.tsx`

### 4. SkeletonCompactTransactionCard

**Mirrors:** `CompactTransactionCard` (`src/components/transactions/CompactTransactionCard.tsx`)

**Card container:** `bg-card border border-border rounded-lg p-3` (matches the compact card's own container, not `money-map-card`)

**Structure (horizontal layout, single row with nested content):**
```
[icon 32x32 rounded-md] | [name bar h-4 w-[100px]]  [amount bar h-4 w-[60px]]
                         | [category bar h-3 w-[80px]]  [date bar h-3 w-[40px]]
```

**Skeleton elements (5 total):**
- Icon: `h-8 w-8 rounded-md`
- Name: `h-4 w-[100px]`
- Amount: `h-4 w-[60px]`
- Category: `h-3 w-[80px]`
- Date: `h-3 w-[40px]`

**File:** `src/components/transactions/SkeletonCompactTransactionCard.tsx`

---

## Design: Loading States

### Initial Load (no data yet)

When `isLoading` is true (first load, no cached data), render **4 skeleton cards** in place of the transaction list. This replaces the current full-page `Loader2` spinner.

- **Desktop pages** (Expenses, Income, Transfers): 4 skeleton cards matching the page's card type in `grid grid-cols-1 gap-4`
- **Mobile TransactionsMobileView**: 4 `SkeletonCompactTransactionCard` items

### Load More (fetching next page)

When `isFetchingMore` is true (previous data visible, new page loading):

1. **Hide** the "Load More" button
2. **Show 3 skeleton cards** below the existing items (same card type as the page)
3. When fetch completes, skeletons are replaced by the full updated list

### Button States

| State | Visible | Content |
|-------|---------|---------|
| Idle (`hasMore && !isFetchingMore`) | Yes | "Load More" (outline button, full width) |
| Fetching more (`isFetchingMore`) | No (replaced by skeletons) | -- |
| All loaded (`!hasMore`) | No | -- |

### Accessibility

- Skeleton containers should have `aria-busy="true"` and `role="status"` during loading
- The existing `Skeleton` component uses `animate-pulse` which respects `prefers-reduced-motion` via Tailwind's built-in media query support

---

## Hook Changes

### Pattern (same for all 3 hooks)

**Import:** Add `keepPreviousData` from `@tanstack/react-query`

**useQuery config:** Add `placeholderData: keepPreviousData`

**Destructure:** Add `isPlaceholderData` and `isFetching` from the query result

**Return:** Add `isFetchingMore: isFetching && isPlaceholderData` (true only when fetching new page with old data showing)

### Files

1. `src/hooks/useExpenseTransactionsQuery.ts`
2. `src/hooks/useIncomeTransactionsQuery.ts`
3. `src/hooks/useTransferTransactionsQuery.ts`

---

## Page Component Changes

### Pattern (same for all 4 components)

1. Destructure the new `isFetchingMore` from the hook
2. Replace full-page spinner/loader with skeleton cards for initial load
3. After the transaction list, conditionally render skeleton cards when `isFetchingMore` is true
4. Conditionally hide the Load More button when `isFetchingMore` is true

### Files

1. `src/app/expenses/page.tsx` — Uses `SkeletonExpenseCard`
2. `src/app/income/page.tsx` — Uses `SkeletonIncomeCard` (note: already uses `SkeletonIncomeTypeCard` for the budget section; the new skeleton is specifically for transaction cards)
3. `src/app/transfers/page.tsx` — Uses `SkeletonTransferCard`
4. `src/components/transactions/TransactionsMobileView.tsx` — Uses `SkeletonCompactTransactionCard`

---

## What NOT To Do

1. **Do not use `useInfiniteQuery`.** The bandwidth cost of re-fetching all items is negligible for this app's scale. The `keepPreviousData` approach achieves the same UX with minimal code change.
2. **Do not add `isFetching` without `placeholderData`.** Without `keepPreviousData`, data goes to `undefined` between query key changes, causing the same flash.
3. **Do not implement client-side data merging** (keeping old data in state). This creates stale data bugs and duplicates TanStack Query's cache.
4. **Do not add per-item fade-in animations.** The items are re-rendered as a full list; animations on 15-45+ items cause paint jank on mobile.
5. **Do not change the desktop table loading behavior.** The `SkeletonTable` and `SkeletonTransferTable` already handle desktop loading and are unrelated to this change.

---

## Handoff Note for Builder

**Feature:** Load More Skeleton Pagination
**Branch name suggestion:** `fix/load-more-skeleton-pagination`
**Files most likely to be affected:**
- `src/hooks/useExpenseTransactionsQuery.ts`
- `src/hooks/useIncomeTransactionsQuery.ts`
- `src/hooks/useTransferTransactionsQuery.ts`
- `src/components/shared/SkeletonExpenseCard.tsx` (new)
- `src/components/shared/SkeletonIncomeCard.tsx` (new)
- `src/components/shared/SkeletonTransferCard.tsx` (new)
- `src/components/transactions/SkeletonCompactTransactionCard.tsx` (new)
- `src/app/expenses/page.tsx`
- `src/app/income/page.tsx`
- `src/app/transfers/page.tsx`
- `src/components/transactions/TransactionsMobileView.tsx`
- Existing hook test files (3 files)

**Watch out for:**
- `keepPreviousData` is a **named export** from `@tanstack/react-query` in v5 (not a string literal like v4's `keepPreviousData: true`). Import it as `import { keepPreviousData } from '@tanstack/react-query'` and pass it as `placeholderData: keepPreviousData`.
- The `isPlaceholderData` boolean comes from `useQuery`'s return value, not from options.
- The Expenses page uses `SkeletonIncomeTypeCard` for initial load of expense cards in the mobile filter view. This is a naming mismatch in the existing code; the new `SkeletonExpenseCard` should replace it.
- The `TransactionsMobileView` has 3 separate tabs each with their own loading state, display count, and load more handler. All 3 must be updated.
- The `money-map-card` CSS class (non-interactive) should be used for the full-size skeleton cards. The compact skeleton uses its own inline classes matching the compact card.

**Verification focus:**
- Click "Load More" on each page and confirm existing items stay visible while skeleton cards appear below
- Verify initial page load shows skeleton cards (not a spinner)
- Verify the Load More button reappears after fetch completes (if more items exist)
- Verify search/filter changes still reset the display count correctly
- Run `npm run lint` and `npm run build` with zero errors
