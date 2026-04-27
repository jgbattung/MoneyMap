# UI Polish Fixes Spec

Three bugs to fix before project pause: layout shift during auth loading, inconsistent table loading states, and mismatched navigation icons.

---

## Bug 1: Layout shift during auth loading

### Root cause
`src/components/layouts/ConditionalLayout.tsx:11` — when `isPending || !session`, the component renders bare `<>{children}</>` with no sidebar, no bottombar, and no `flex-1` wrapper. The root layout wraps everything in `<main className="flex h-screen overflow-hidden">`, so without the flex-1 wrapper the content fills the entire viewport width, then snaps to the constrained layout once auth resolves.

### Fix
Always render the layout shell during `isPending`. The sidebar (`hidden md:flex`) and bottombar (`md:hidden`) are mutually exclusive by breakpoint — render the structural containers for both but without interactive nav content. Always wrap children in `<div className="flex-1 overflow-auto">`.

**Change in `ConditionalLayout.tsx`:**
```tsx
// Before
if (isPending || !session) {
  return <>{children}</>
}

// After
if (isPending || !session) {
  return (
    <>
      {/* Sidebar placeholder — desktop only */}
      <div className="hidden md:flex flex-col bg-background border-r border-secondary-700 w-56" />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      {/* Bottombar placeholder — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-background border-t-2 border-secondary-700" />
    </>
  )
}
```

The sidebar placeholder must match the Sidebar's width (`w-56`) and the bottombar placeholder must match BottomBar's height (`h-14`) to prevent layout shift.

### Files changed
- `src/components/layouts/ConditionalLayout.tsx`

---

## Bug 2: Inconsistent table loading states

### Root cause
The three desktop table components handle loading differently:

| Table | Has loading guard? | Shows during load |
|---|---|---|
| `ExpenseTable` (line 380) | **No** | "No expenses found" (empty state) |
| `IncomeTable` (line 501) | Yes (`accountsLoading \|\| incomeTypesLoading`) | `<SkeletonTable>` |
| `TransferTable` (line 526) | Yes (`accountsLoading \|\| transferTypesLoading`) | `<SkeletonTransferTable>` |

`ExpenseTable` never destructures `isLoading` from any of its query hooks, so it immediately renders the table with empty data.

### Fix
Add a loading guard to `ExpenseTable` matching the pattern used by `IncomeTable` and `TransferTable`:

1. Destructure `isLoading` from `useAccountsQuery`, `useCardsQuery`, and `useExpenseTypesQuery`
2. Check `const isLoadingData = accountsLoading || cardsLoading || expenseTypesLoading`
3. Return `<SkeletonTable tableType="expense" />` when loading

**Change in `ExpenseTable.tsx` around line 380-384:**
```tsx
// Before
const { accounts } = useAccountsQuery();
const { cards } = useCardsQuery();
const { budgets } = useExpenseTypesQuery();

// After
const { accounts, isLoading: accountsLoading } = useAccountsQuery();
const { cards, isLoading: cardsLoading } = useCardsQuery();
const { budgets, isLoading: expenseTypesLoading } = useExpenseTypesQuery();
```

Add early return before the table render (before `PAGE_SIZE_OPTIONS`):
```tsx
const isLoadingData = accountsLoading || cardsLoading || expenseTypesLoading;

if (isLoadingData) {
  return (
    <div className="md:block mt-10">
      <SkeletonTable tableType="expense" />
    </div>
  );
}
```

Also add `SkeletonTable` to the imports.

### Files changed
- `src/components/tables/expenses/ExpenseTable.tsx`

---

## Bug 3: Navigation icon consistency

### Root cause
`src/app/constants/navigation.ts` — five nav items use a different icon shape for their active (filled) state because the original outline icon doesn't have a `Filled` variant in `@tabler/icons-react`. The fix is to swap the outline icons to ones that DO have filled counterparts.

### Icon mapping

| Item | Before (outline / filled) | After (outline / filled) |
|---|---|---|
| Transactions | `IconSwitchHorizontal` / `IconReceiptFilled` | `IconReceipt` / `IconReceiptFilled` |
| Expenses | `IconWallet` / `IconCoinFilled` | `IconCoin` / `IconCoinFilled` |
| Income | `IconTrendingUp` / `IconGraphFilled` | `IconGraph` / `IconGraphFilled` |
| Transfers | `IconArrowsExchange` / `IconExchangeFilled` | `IconExchange` / `IconExchangeFilled` |
| Reports | `IconChartBar` / `IconReportAnalyticsFilled` | `IconReportAnalytics` / `IconReportAnalyticsFilled` |

The `mobileNavRoutes` array also references Transactions — update that too.

### Import changes in `navigation.ts`

Remove: `IconSwitchHorizontal`, `IconWallet`, `IconCoinFilled` (already imported but will remain since it's the filled pair), `IconTrendingUp`, `IconArrowsExchange`, `IconChartBar`

Wait — `IconCoinFilled`, `IconGraphFilled`, `IconExchangeFilled`, `IconReceiptFilled`, `IconReportAnalyticsFilled` all stay (they're the filled variants). Only the outline icons change:

**Remove from imports:** `IconSwitchHorizontal`, `IconWallet`, `IconTrendingUp`, `IconArrowsExchange`, `IconChartBar`

**Add to imports:** `IconReceipt`, `IconCoin`, `IconGraph`, `IconExchange`, `IconReportAnalytics`

Note: `IconWallet` and `IconTrendingUp` are also used in `src/components/icons.tsx` — do NOT remove them from there. They are only being removed from `navigation.ts`.

### Files changed
- `src/app/constants/navigation.ts`
