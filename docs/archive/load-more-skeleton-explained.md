# Load More Skeleton Pagination — Explained

> Generated from: load-more-skeleton-spec.md, load-more-skeleton-plan.xml, load-more-skeleton-verification.md
> Branch: fix/load-more-skeleton-pagination
> Date: 2026-03-20

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 12 |
| Files created | 8 (4 skeleton components + 4 test files) |
| Files modified | 10 |
| Tests written | 7 test files, 866 total tests passing |
| Commits | 12 feature commits |

**In one sentence:** Fixed a jarring "flash to blank" bug on the Load More button across all transaction list pages by adding TanStack Query's `keepPreviousData` option to three hooks and replacing spinner-based loading states with contextually matched skeleton card components.

---

## What Was Built

Before this fix, clicking "Load More" on any transaction page — Expenses, Income, Transfers, or the mobile Transactions view — caused the entire list to disappear and be replaced by a loading spinner. This happened because the hooks use `useQuery` with `take` (the page size) as part of the query key. Increasing `displayCount` from 15 to 30 produces a new query key, and TanStack Query treats that as a brand-new query with no cached data, so `isPending` becomes `true` and the previous results are wiped from the UI.

The fix adds `placeholderData: keepPreviousData` to each of the three transaction query hooks. This single option tells TanStack Query to keep displaying the previous query's data while the new query is in-flight. The hooks now expose two distinct loading signals: `isLoading` (which is only `true` on the very first load when there is no cached data at all) and the newly derived `isFetchingMore` (which is `true` only when a page transition is happening with previous data still visible). The pages use `isLoading` to show an initial skeleton placeholder and `isFetchingMore` to append inline skeleton cards below the existing list while new data loads.

Four new skeleton card components were created — one for each transaction card type. Each skeleton mirrors the exact layout of its real counterpart (icon placeholder, name bar, category/type bar, date bar, amount bar) and uses the existing `Skeleton` UI primitive with `animate-pulse`. The Load More button hides itself when `isFetchingMore` is true and the skeletons are shown in its place, creating a seamless extension of the list rather than a disruptive reload.

---

## Deep Dive

### Data Layer

No schema changes were made.

### API Layer

No API routes were created or modified.

### State and Data Fetching Layer

Three hooks were updated following an identical pattern:

- `src/hooks/useExpenseTransactionsQuery.ts`
- `src/hooks/useIncomeTransactionsQuery.ts`
- `src/hooks/useTransferTransactionsQuery.ts`

In each hook, `keepPreviousData` was added to the import from `@tanstack/react-query` and passed as `placeholderData: keepPreviousData` in the `useQuery` options. The query result is now destructured for two additional values: `isFetching` (true any time the query is actively fetching, including page transitions) and `isPlaceholderData` (true when the currently displayed data is from a previous query key, i.e., stale placeholder). The hook returns a derived value: `isFetchingMore: isFetching && isPlaceholderData`. This compound boolean is `true` only in the specific case of loading a new page while old data is still shown — never during the initial load.

Note: In TanStack Query v5, `keepPreviousData` is a named function imported from the library and passed as the value of `placeholderData`. This differs from v4, where it was a string literal option (`keepPreviousData: true`). The `isPlaceholderData` flag comes from the query result object, not the options.

### UI Layer

Four skeleton components were created:

- `src/components/shared/SkeletonExpenseCard.tsx` — mirrors `ExpenseCard`, uses `money-map-card` container
- `src/components/shared/SkeletonIncomeCard.tsx` — mirrors `IncomeCard`, uses `money-map-card` container
- `src/components/shared/SkeletonTransferCard.tsx` — mirrors `TransferCard`, uses `money-map-card` container with an extra right-aligned accounts bar
- `src/components/transactions/SkeletonCompactTransactionCard.tsx` — mirrors `CompactTransactionCard`, uses inline classes (`bg-card border border-border rounded-lg p-3`) since compact cards do not use the `money-map-card` class

Each component includes `role="status"` and `aria-busy="true"` for accessibility. The `Skeleton` primitive applies `animate-pulse`, which respects the user's `prefers-reduced-motion` setting via Tailwind's built-in media query support.

Four page components were updated:

- `src/app/expenses/page.tsx` — initial mobile load now shows 4 `SkeletonExpenseCard`; Load More shows 3 inline
- `src/app/income/page.tsx` — same with `SkeletonIncomeCard`; the `SkeletonIncomeTypeCard` import remains only for the Income Categories budget section
- `src/app/transfers/page.tsx` — same with `SkeletonTransferCard`
- `src/components/transactions/TransactionsMobileView.tsx` — all 3 tabs (expenses, income, transfers) updated to use `SkeletonCompactTransactionCard`; each tab has its own aliased `isFetchingMore` value (e.g., `expensesFetchingMore`, `incomeFetchingMore`, `transfersFetchingMore`)

In all four components the Load More button condition was changed from `hasMore && (` to `hasMore && !isFetchingMore && (`, hiding the button during an active page fetch.

### Validation Layer

No Zod schemas were added or modified.

---

## Data Flow

The most important user action is clicking "Load More" on the Expenses page.

1. The user clicks the "Load More" button, which calls `setDisplayCount(prev => prev + 15)` in the page component's local state.
2. `displayCount` changes from 15 to 30. This is passed as `take: 30` into `useExpenseTransactionsQuery`.
3. Inside the hook, `useQuery` receives a new query key that includes `take: 30`. TanStack Query identifies this as a new query and begins fetching.
4. Because `placeholderData: keepPreviousData` is set, `useQuery` does not set `data` to `undefined`. Instead, `isPlaceholderData` becomes `true` and `data` continues to hold the previous 15-item result.
5. `isFetching` becomes `true` as the fetch begins.
6. The hook's computed value `isFetchingMore` (`isFetching && isPlaceholderData`) is now `true`.
7. The page component reads `isFetchingMore` as `true`. The Load More button is hidden (`hasMore && !isFetchingMore` evaluates to `false`). Three `SkeletonExpenseCard` components render below the existing 15 real cards.
8. The fetch completes. The API returns 30 expense records. TanStack Query stores the result under the new query key.
9. `isFetching` becomes `false`; `isPlaceholderData` becomes `false`. `isFetchingMore` drops back to `false`.
10. The page re-renders with the full 30 real cards. The skeleton cards are removed and the Load More button reappears (if more records exist).

---

## Files Changed

| File | Change Type | What Changed |
|------|------------|--------------|
| `src/hooks/useExpenseTransactionsQuery.ts` | Modified | Added `keepPreviousData`, `isPlaceholderData`, `isFetching`; exposed `isFetchingMore` |
| `src/hooks/useIncomeTransactionsQuery.ts` | Modified | Same pattern as above |
| `src/hooks/useTransferTransactionsQuery.ts` | Modified | Same pattern as above |
| `src/components/shared/SkeletonExpenseCard.tsx` | Created | Skeleton mirror of `ExpenseCard` |
| `src/components/shared/SkeletonIncomeCard.tsx` | Created | Skeleton mirror of `IncomeCard` |
| `src/components/shared/SkeletonTransferCard.tsx` | Created | Skeleton mirror of `TransferCard` |
| `src/components/transactions/SkeletonCompactTransactionCard.tsx` | Created | Skeleton mirror of `CompactTransactionCard` |
| `src/app/expenses/page.tsx` | Modified | Replaced spinner with skeleton cards; added inline load-more skeletons; updated Load More button guard |
| `src/app/income/page.tsx` | Modified | Same; `SkeletonIncomeTypeCard` retained only for budget section |
| `src/app/transfers/page.tsx` | Modified | Same with `SkeletonTransferCard` |
| `src/components/transactions/TransactionsMobileView.tsx` | Modified | All 3 tabs updated; aliased `isFetchingMore` per tab; replaced `Loader2` spinner |
| `src/hooks/useExpenseTransactionsQuery.test.ts` | Modified | Added `isFetchingMore` return-value test |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | Modified | Added `isFetchingMore` return-value test |
| `src/hooks/useTransferTransactionsQuery.test.ts` | Modified | Added `isFetchingMore` return-value test |
| `src/components/shared/SkeletonExpenseCard.test.tsx` | Created | 6 tests for render, classes, accessibility, skeleton count |
| `src/components/shared/SkeletonIncomeCard.test.tsx` | Created | Same structure |
| `src/components/shared/SkeletonTransferCard.test.tsx` | Created | Same structure |
| `src/components/transactions/SkeletonCompactTransactionCard.test.tsx` | Created | Same structure |
| `src/components/transactions/TransactionsMobileView.test.tsx` | Modified | Updated mocks to include `isFetchingMore: false` |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|--------------|-----------|
| `src/components/shared/SkeletonExpenseCard.test.tsx` | SkeletonExpenseCard component | Renders without crash, correct root CSS classes, `role="status"`, `aria-busy="true"`, animated skeleton elements present, correct element count (5) |
| `src/components/shared/SkeletonIncomeCard.test.tsx` | SkeletonIncomeCard component | Same 6 cases as above |
| `src/components/shared/SkeletonTransferCard.test.tsx` | SkeletonTransferCard component | Same 6 cases as above |
| `src/components/transactions/SkeletonCompactTransactionCard.test.tsx` | SkeletonCompactTransactionCard component | Same 6 cases; also verifies compact container classes |
| `src/hooks/useExpenseTransactionsQuery.test.ts` | `isFetchingMore` return value | Returns `isFetchingMore: false` during initial load |
| `src/hooks/useIncomeTransactionsQuery.test.ts` | `isFetchingMore` return value | Same |
| `src/hooks/useTransferTransactionsQuery.test.ts` | `isFetchingMore` return value | Same |

The test strategy for skeleton components focuses on contract verification rather than visual regression: each test checks that the component renders with the correct accessibility attributes (`role="status"`, `aria-busy="true"`), that the container applies the expected CSS classes, and that the correct number of animated skeleton elements is present. Hook tests intentionally do not test the `keepPreviousData` behavior itself — that is TanStack Query's responsibility — but do assert that the hook's public interface includes `isFetchingMore` and that it is `false` in the initial (non-paginating) state.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| `placeholderData: keepPreviousData` | A TanStack Query v5 option that keeps the last successful query result as the visible data when the query key changes, instead of resetting to `undefined` | Added to all 3 transaction hooks so the existing list stays visible when `displayCount` increases |
| `isPlaceholderData` | A boolean from `useQuery`'s return value that is `true` when the displayed data comes from a previous query key (not the current one) | Combined with `isFetching` to derive the precise `isFetchingMore` signal |
| `isFetching` vs `isPending` | In TanStack Query v5, `isPending` is `true` only when there is no data at all (true first-load); `isFetching` is `true` on any background fetch including page transitions | `isPending` (aliased as `isLoading`) guards initial skeleton rendering; `isFetching` powers the load-more skeleton |
| Query key invalidation | When any value in the query key array changes, TanStack Query treats it as a new query | The root cause of the original flash: `take` is in the key, so incrementing it spawned a new query without `keepPreviousData` |
| Skeleton UI pattern | Placeholder components that match the shape of real content and animate during loading to signal to users that data is on its way | Applied at two levels: initial load (4 cards replacing the list) and load-more (3 cards appended below the list) |
| `animate-pulse` with `prefers-reduced-motion` | Tailwind's `animate-pulse` class is governed by a CSS animation that the browser disables automatically when the user has enabled reduced-motion in their OS accessibility settings | Used in all skeleton components via the `Skeleton` primitive — no extra code needed |
| Derived state in hook return | Computing a value from two raw query flags inside the hook, then exposing only the derived value to consumers | `isFetchingMore: isFetching && isPlaceholderData` is computed once in the hook; page components never need to import or reason about `isPlaceholderData` directly |

---

## What To Look At Next

- `src/hooks/useExpenseTransactionsQuery.ts` — The cleanest entry point to understand the `keepPreviousData` pattern. The hook is short and all three changes (import, option, derived return value) are visible together.
- `src/app/expenses/page.tsx` — Shows how `isLoading` and `isFetchingMore` drive two distinct skeleton rendering locations in a single page component.
- `src/components/shared/SkeletonExpenseCard.tsx` — Illustrates the skeleton component convention: `money-map-card` container, `Skeleton` primitive, accessibility attributes, and the specific dimension classes that mirror the real card's layout.
