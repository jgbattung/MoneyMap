# UI Hotfix Batch — Spec

> Four layout and UX fixes for TransactionAnalyzer, CategoryBreakdown, and app-wide BottomBar overlap.

## Objectives

1. **Fix tag/account field misalignment** in TransactionAnalyzer when tag pills are visible.
2. **Fix BottomBar overlap on mobile** across all authenticated pages.
3. **Add client-side "Show More" to CategoryBreakdownChart** to prevent excessively long lists on mobile.
4. **Fix TransactionAnalyzer "Load More"** so existing results stay visible instead of the entire section reloading.

## Scope

**In scope:**
- CSS/layout fixes (issues 1 & 2)
- Client-side display truncation (issue 3)
- Hook + component refactor for load-more behavior (issue 4)

**Out of scope:**
- API route changes (none needed)
- Database changes (none needed)
- New UI components or design elements
- iOS safe-area-inset handling (not reported as an issue)

---

## Fix 1: Tag/Account Field Misalignment

### Problem
In `src/components/reports/TransactionAnalyzer.tsx` (line 476), the Tags and Account fields sit in a 2-column grid:
```
grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4
```

When tag pills render inside the Tags `FormItem` (lines 530-545), the Tags column height increases. CSS Grid's default `stretch` alignment causes the Account column to vertically stretch with it, making the Account dropdown appear to drop down.

### Fix
Add `items-start` to the grid container at line 476:
```
grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start
```

This aligns both grid children to the top, so the Account field stays at the same vertical position regardless of tag pill height.

### Files affected
- `src/components/reports/TransactionAnalyzer.tsx`

---

## Fix 2: BottomBar Overlap (App-Wide)

### Problem
The BottomBar (`src/components/shared/BottomBar.tsx`) is `fixed bottom-0 h-14` (56px), visible only on mobile (`md:hidden`). Most pages use `pb-20` (80px) which leaves only 24px of clearance — not enough. Two pages (`/more`, `/transfers`) have no mobile bottom padding at all.

### Fix
Update all page containers from `pb-20` to `pb-24` (96px = 56px bar + 40px clearance). Add `pb-24 md:pb-6` to pages that are currently missing mobile padding.

### Pages to update

| Page | File | Current | Target |
|------|------|---------|--------|
| Dashboard | `src/app/dashboard/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Accounts | `src/app/accounts/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Accounts Detail | `src/app/accounts/[id]/page.tsx` | `pb-20 md:pb-6` (multiple) | `pb-24 md:pb-6` |
| Budgets | `src/app/budgets/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Cards | `src/app/cards/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Card Detail | `src/app/cards/[id]/page.tsx` | `pb-20 md:pb-6` (multiple) | `pb-24 md:pb-6` |
| Card Group | `src/app/cards/groups/[groupName]/page.tsx` | `pb-20 md:pb-6` (multiple) | `pb-24 md:pb-6` |
| Expenses | `src/app/expenses/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Income | `src/app/income/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Reports | `src/app/reports/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Settings | `src/app/settings/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Transactions | `src/app/transactions/page.tsx` | `pb-20 md:pb-6` | `pb-24 md:pb-6` |
| Transfers | `src/app/transfers/page.tsx` | **None** | **Add** `pb-24 md:pb-6` |
| More | `src/app/more/page.tsx` | **None** | **Add** `pb-24 md:pb-6` |

### Important note
Some pages have multiple render paths (loading, error, success) each with their own container div. All render paths must be updated.

---

## Fix 3: CategoryBreakdown "Show More"

### Problem
`src/components/shared/CategoryBreakdownChart.tsx` renders all categories in the breakdown list (lines 217-239). On the Expenses tab with many categories, this creates an excessively long list on mobile.

### Fix
Add client-side truncation to the breakdown list only (not the pie chart or legend grid):

1. Add a `showAll` state, defaulting to `false`.
2. Define `INITIAL_DISPLAY_COUNT = 10`.
3. In the breakdown list, slice `chartData` to show only the first 10 items when `showAll` is `false`.
4. If `chartData.length > INITIAL_DISPLAY_COUNT`, show a "Show More (N remaining)" button below the list.
5. When clicked, set `showAll` to `true` — reveal all items. No re-fetch, no flicker.
6. Reset `showAll` to `false` when the component's `type`, `month`, or `year` props change (so switching tabs or months resets the truncation).

### Design details
- Button style: `variant="ghost"`, full width, `text-sm text-muted-foreground`
- Button text when collapsed: `Show More (N remaining)`
- Button text when expanded: `Show Less`
- No animation needed — simple show/hide.

### Files affected
- `src/components/shared/CategoryBreakdownChart.tsx`

---

## Fix 4: TransactionAnalyzer Load More

### Problem
In `src/hooks/useTransactionAnalysis.ts` (line 41), the query key includes the full `params` object:
```ts
queryKey: ["transactionAnalysis", params]
```

When `handleLoadMore` in `TransactionAnalyzer.tsx` (line 172-178) changes `skip`, the query key changes entirely. TanStack Query treats this as a new query — the old cache is abandoned, and the entire results section reloads.

### Reference implementation
`useExpenseTransactionsQuery.ts` handles this correctly:
- Always fetches with `skip: 0` and `take: displayCount`
- Uses `placeholderData: keepPreviousData`
- Exposes `isFetchingMore: isFetching && isPlaceholderData`
- Component uses a simple `displayCount` state that increments on "Load More"

### Fix — Hook changes (`useTransactionAnalysis.ts`)
1. Add `import { keepPreviousData } from "@tanstack/react-query"`
2. Add `placeholderData: keepPreviousData` to the `useQuery` options
3. Destructure `isPlaceholderData` from `useQuery`
4. Export `isFetchingMore: isFetching && isPlaceholderData`

### Fix — Component changes (`TransactionAnalyzer.tsx`)

1. **Remove** the following state/refs:
   - `accumulatedTransactions` state (line 86-88)
   - `isLoadingMore` state (line 90)
   - `prevDataRef` ref (line 91)
   - The `useEffect` that accumulates transactions (lines 114-124)

2. **Add** a `displayCount` state:
   ```ts
   const [displayCount, setDisplayCount] = useState(5);
   ```

3. **Update `buildParams`** to always use `skip: 0` and `take: displayCount`:
   - Remove `skip: 0, take: 5` from `buildParams` (lines 139-140)
   - Pass `skip: 0, take: displayCount` when constructing `analysisParams`

4. **Update `handleAnalyze`** to reset `displayCount` to 5.

5. **Replace `handleLoadMore`** with:
   ```ts
   const handleLoadMore = useCallback(() => {
     setDisplayCount(prev => prev + 10);
   }, []);
   ```
   The query key will change (because `take` changes in params), but `keepPreviousData` ensures the old results stay visible during refetch.

6. **Update the results rendering:**
   - Replace `accumulatedTransactions` with `data.transactions` everywhere
   - Replace `isLoadingMore` checks with `isFetchingMore` from the hook
   - Keep the skeleton loading indicators for the "fetching more" state
   - Update the "remaining" count: `data.transactionCount - data.transactions.length`

### Files affected
- `src/hooks/useTransactionAnalysis.ts`
- `src/components/reports/TransactionAnalyzer.tsx`

---

## Verification Plan

For each fix:
1. **Fix 1:** Open TransactionAnalyzer, select 1+ tags. Verify the Account dropdown stays vertically aligned with the Tags button.
2. **Fix 2:** Open any page on a mobile viewport (< 768px). Scroll to the bottom. Verify content is not hidden behind the BottomBar.
3. **Fix 3:** Open Reports > Expenses tab with a month that has > 10 expense categories. Verify only 10 items show initially with a "Show More" button. Click it — all items appear. Switch months — resets to 10.
4. **Fix 4:** Open TransactionAnalyzer, run an analysis with many results. Click "Load More". Verify existing results stay visible and new results append below with skeleton placeholders during loading.
5. **Build check:** `npm run build` passes with zero errors.
6. **Lint check:** `npm run lint` passes with zero errors.

---

## Handoff Note for Builder

**Feature:** UI Hotfix Batch (4 fixes)
**Branch name suggestion:** `fix/ui-hotfix-batch`
**Files most likely to be affected:**
- `src/components/reports/TransactionAnalyzer.tsx`
- `src/hooks/useTransactionAnalysis.ts`
- `src/components/shared/CategoryBreakdownChart.tsx`
- All `src/app/**/page.tsx` files (bottom padding)

**Watch out for:**
- `accounts/[id]/page.tsx`, `cards/[id]/page.tsx`, and `cards/groups/[groupName]/page.tsx` have **multiple render paths** (loading, error, success) — each has its own container div with `pb-20` that must be updated.
- The TransactionAnalyzer refactor (Fix 4) changes the data flow significantly. Make sure the "remaining" count in the Load More button still calculates correctly: `data.transactionCount - data.transactions.length`.
- The `handleClearFilters` function needs to reset `displayCount` back to 5.
- `CategoryBreakdownChart` should reset `showAll` when props change — use a `useEffect` watching `type`, `month`, `year`.
- The query in `useTransactionAnalysis` uses `enabled: false` (manual trigger via `refetch()`). The `keepPreviousData` + display count pattern still works because the query key changes when `take` changes, and `refetch()` is called. But `skip` and `take` must be part of `analysisParams` that get passed to the hook for the query key to update properly.

**Verification focus:**
- Mobile viewport testing for Fixes 1, 2, and 3
- Load More behavior for Fixes 3 and 4 — no flicker, no full reload
- Build and lint passing
