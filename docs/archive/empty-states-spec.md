# Empty States Spec

> Unified empty state component and consistent UX across all Money Map pages, dashboard widgets, and data tables.

## Objective

Create a single shared `EmptyState` component and refactor all ~19 existing inline empty states to use it. This eliminates code duplication, standardizes copy and visual treatment, and improves the user experience with contextual icons and actionable CTAs where appropriate.

## Scope

### In Scope

- New shared component: `src/components/shared/EmptyState.tsx`
- Refactor all full-page empty states (6 locations)
- Refactor all dashboard widget empty states (6 locations)
- Refactor all table/list empty states (7 locations)
- Update existing test assertions that reference old empty state text

### Out of Scope

- Error states (these remain as-is; they follow a different pattern)
- Loading/skeleton states
- Adding new pages or features
- Database changes

## Component API

### File Location

`src/components/shared/EmptyState.tsx`

### Props

```typescript
import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  href?: string;      // Renders as Next.js <Link>
  onClick?: () => void; // Renders as Shadcn <Button>
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  variant: 'page' | 'widget' | 'table';
}
```

### Rendering Logic

- If `action.href` is provided, render as a Next.js `<Link>` (used by widget CTAs).
- If `action.onClick` is provided, render as a Shadcn `<Button>` (used by page CTAs).
- If `action` is omitted, no CTA is rendered.
- All icons receive `aria-hidden="true"` since they are decorative.

---

## Visual Design Tokens

### Variant: `page`

Used on full resource list pages when zero resources exist.

| Property | Value |
|----------|-------|
| Container | `flex-1 flex flex-col items-center justify-center text-center py-16` |
| Icon size | `h-20 w-20` |
| Icon color | `text-muted-foreground/40` |
| Icon strokeWidth | `1.25` |
| Icon margin | `mb-6` |
| Title size | `text-xl md:text-2xl` |
| Title weight | `font-semibold` |
| Title color | `text-foreground` |
| Description size | `text-sm md:text-base` |
| Description color | `text-muted-foreground` |
| Description max-width | `max-w-sm` |
| Description margin | `mt-2` |
| Button margin | `mt-8` |
| Button (mobile) | Shadcn `Button` variant `default`, size `default` |
| Button (desktop) | Shadcn `Button` variant `default`, size `lg` with `text-base` |
| Button responsive | `size="default"` wrapping class: `md:hidden`, `size="lg"` wrapping class: `hidden md:flex` -- OR use a single button with responsive classes `h-9 md:h-10 px-4 md:px-6 text-sm md:text-base` |

**Implementation note on page CTA:** The current codebase uses separate desktop/mobile buttons because they trigger Sheet (desktop) vs Drawer (mobile). The `EmptyState` component should render a single `<Button>` with the `action.onClick` handler. The parent page is responsible for detecting viewport and opening the correct Sheet/Drawer -- this is already handled by the existing `onClick` handlers that check `window.innerWidth`. The `EmptyState` button should use responsive sizing: apply classes `h-9 md:h-10 px-4 md:px-6 text-sm md:text-base` to achieve the size difference without two separate buttons.

### Variant: `widget`

Used inside dashboard cards when zero data exists.

| Property | Value |
|----------|-------|
| Container | `flex flex-col items-center justify-center text-center py-8 gap-1.5` |
| Icon size | `h-8 w-8` |
| Icon color | `text-muted-foreground/40` |
| Icon strokeWidth | `1.5` |
| Icon margin | `mb-1` |
| Title size | `text-sm` |
| Title weight | `font-medium` |
| Title color | `text-muted-foreground` |
| Description size | `text-xs` |
| Description color | `text-muted-foreground/70` |
| Description max-width | `max-w-[240px]` |
| Link margin | `mt-2` |
| Link style | `text-xs text-primary hover:text-primary/80 hover:underline` |

**Implementation note on widget CTA:** The `action.href` renders as a Next.js `<Link>` component. This navigates the user to the resource page where they can take action.

### Variant: `table`

Used inside data tables and mobile list views when search/filter returns zero rows.

| Property | Value |
|----------|-------|
| Container | `flex flex-col items-center justify-center text-center h-32 gap-1.5` |
| Icon size | `h-6 w-6` |
| Icon color | `text-muted-foreground/30` |
| Icon strokeWidth | `1.5` |
| Icon margin | `mb-1` |
| Title size | `text-sm` |
| Title weight | `font-normal` |
| Title color | `text-muted-foreground` |
| Description size | `text-xs` |
| Description color | `text-muted-foreground/70` |
| No CTA | Table empty states do not render any interactive CTA. |

---

## Copy Standards

### Naming Conventions

- **No trailing periods** on titles.
- **No exclamation marks** anywhere.
- **Consistent capitalization**: sentence case only.
- **No "yet." with period** -- use "yet" without period or omit it for time-scoped states.

### Copy Table (All Locations)

#### Full-Page Empty States (variant: `page`)

| Page | Icon (Lucide) | Title | Description | CTA Label |
|------|---------------|-------|-------------|-----------|
| Accounts | `Wallet` | No accounts yet | Add your first account to start tracking your finances. | Add your first account |
| Budgets | `PiggyBank` | No budgets yet | Add your first budget to start managing your spending. | Add your first budget |
| Credit Cards | `CreditCard` | No credit cards yet | Add your first credit card to start tracking your debt. | Add your first credit card |
| Expenses | `Receipt` | No expenses yet | Add your first expense to start tracking your spending. | Add your first expense |
| Income | `HandCoins` | No income categories yet | Add your first income category to start tracking earnings. | Add your first income category |
| Card Group (empty) | `CreditCard` | No cards in this group | This card group has no cards assigned to it. | Back to Cards (uses `action.href="/cards"`) |

**Note on Card Group:** The card group detail page currently shows "No cards found in this group" with a "Back to Cards" button. This is a navigation-back CTA, not a create CTA, so it should use `action.href="/cards"` (rendered as a Link-styled Button).

#### Dashboard Widget Empty States (variant: `widget`)

| Widget | Icon (Lucide) | Title | Description | CTA (Link) |
|--------|---------------|-------|-------------|------------|
| Accounts summary | `Wallet` | No accounts yet | Add an account to start tracking | Go to Accounts (`/accounts`) |
| Credit cards summary | `CreditCard` | No credit cards yet | Add a credit card to track debt | Go to Cards (`/cards`) |
| Recent transactions | `ArrowLeftRight` | No transactions yet | Record a transaction to see activity | Go to Expenses (`/expenses`) |
| Budget status | `PiggyBank` | No budget activity | Create a budget to track spending | Go to Budgets (`/budgets`) |
| Asset categories chart | `PieChart` | No asset categories | Add accounts to see distribution | Go to Accounts (`/accounts`) |
| Monthly summary chart | `BarChart3` | No data for this period | Data will appear once transactions are recorded. | None |
| Net worth history chart | `TrendingUp` | No history available | Net worth trends will appear over time. | None |

#### Table/List Empty States (variant: `table`)

| Location | Icon (Lucide) | Title | Description |
|----------|---------------|-------|-------------|
| Expense table | `SearchX` | No expenses found | Try adjusting your search or filters. |
| Income table | `SearchX` | No income found | Try adjusting your search or filters. |
| Transfer table | `SearchX` | No transfers found | Try adjusting your search or filters. |
| Transfers mobile (search results) | `SearchX` | No results found | Try adjusting your search or filters. |
| Transfer types list | `ArrowLeftRight` | No transfer types yet | Add your first transfer type above. |
| Annual summary table | `CalendarX2` | No transaction data | Data will appear once transactions are recorded. |
| Expense breakdown chart | `PieChart` | No expenses this month | Expenses will appear here once recorded. |
| Category breakdown chart (expense) | `PieChart` | No expenses this month | Expenses will appear here once recorded. |
| Category breakdown chart (income) | `HandCoins` | No income this month | Income will appear here once recorded. |

**Note on Transactions mobile view:** The file at `src/components/transactions/TransactionsMobileView.tsx` also has an empty search state. Check if this exists and include it if so. The test file `TransactionsMobileView.test.tsx` references "No results found for your search." so it should be updated.

---

## Accessibility

1. All empty state icons: `aria-hidden="true"`.
2. CTA buttons inherit Shadcn `Button` focus-visible rings.
3. Link CTAs (`<Link>`) are naturally focusable and do not need extra ARIA.
4. Text contrast: `text-muted-foreground` (oklch 0.708) on background (oklch 0.145 dark) exceeds WCAG 4.5:1.
5. No animations are used in empty states -- no `prefers-reduced-motion` concerns.

---

## Test Impact

The following test files contain assertions that reference old empty state text. The Builder must update these assertions to match the new copy. The QA pipeline will catch any mismatches, but listing them here avoids surprises:

| Test File | Old Text | New Text |
|-----------|----------|----------|
| `ExpenseTable.test.tsx` | "No expense transactions found." | "No expenses found" |
| `IncomeTable.test.tsx` | "No income transactions found." | "No income found" |
| `TransferTable.test.tsx` | "No transfer transactions found." | "No transfers found" |
| `ExpenseBreakdownChart.test.tsx` | "No expenses recorded for this month." | "No expenses this month" |
| `AccountsSummary.test.tsx` | "No accounts yet" | "No accounts yet" (unchanged) |
| `AccountsSummary.test.tsx` | "No credit cards yet" | "No credit cards yet" (unchanged) |
| `RecentTransactions.test.tsx` | "No transactions yet" | "No transactions yet" (unchanged) |
| `BudgetStatus.test.tsx` | "No budget activity this month" | "No budget activity" |
| `AssetCategoriesChart.test.tsx` | "No asset categories" | "No asset categories" (unchanged) |
| `TransactionsMobileView.test.tsx` | "No results found for your search." | "No results found" |

**Tests that need description text updates:** Several tests also assert on description text (e.g., "Add your first account to start tracking"). The Builder should check each test file when refactoring the corresponding component and update all affected assertions.

---

## Verification Plan

For each phase:

1. **Lint passes:** `npm run lint` returns zero errors.
2. **Build passes:** `npm run build` returns zero errors.
3. **Tests pass:** `npx vitest run` -- all existing tests pass (with updated assertions).
4. **Visual verification:** The Builder should describe what the empty state looks like after each refactor (icon, text, CTA presence) in the verification doc.

---

## Handoff Note for Builder

**Read this before writing any code.**

1. Start by creating the `EmptyState` component (Phase 1). This is the foundation for all subsequent phases.
2. The component uses **Lucide React icons exclusively** (not Tabler). Import icons directly from `lucide-react`.
3. For the `page` variant CTA button, render a **single** `<Button>` with responsive sizing classes. Do NOT render two separate buttons for mobile/desktop. The parent page's `onClick` handler already handles the Sheet/Drawer split via `window.innerWidth` checks.
4. For the `widget` variant CTA link, use Next.js `<Link>` from `next/link`.
5. For the `table` variant, render **no CTA at all**. The description text is sufficient.
6. When refactoring existing empty states, **preserve the parent container structure**. For example, dashboard widgets wrap their empty state in a `<div className='flex flex-col gap-3'>` with a `<h2>` title above -- do not remove or restructure that outer wrapper. Only replace the inner empty state JSX.
7. The `CategoryBreakdownChart` component uses a `TYPE_CONFIG` object with `emptyMessage` strings. After refactoring to use `EmptyState`, the `emptyMessage` fields in `TYPE_CONFIG` may become unused -- remove them if so.
8. Update all test assertions listed in the Test Impact section. Run `npx vitest run` after each phase to confirm.
9. Follow one-commit-per-task convention from the plan.
10. The `TransferTypesList` empty state currently says "No transfer types yet. Add your first one above!" -- this is a `table` variant (it is an inline list, not a full page). Replace with the shared `EmptyState` using `variant="table"`.
