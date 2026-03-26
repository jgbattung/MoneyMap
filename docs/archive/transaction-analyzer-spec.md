# Transaction Analyzer -- Feature Specification

> **Status:** Ready for Builder
> **Author:** Architect
> **Date:** 2026-03-25
> **Branch:** `feature/transaction-analyzer`

---

## 1. Objectives

Add a **Transaction Analyzer** section to the reports page that lets users apply stackable filters across their expense or income transactions, then view aggregated totals, a category/subcategory breakdown with visual proportion bars, and a paginated list of matching transactions.

### Goals

- Provide flexible, ad-hoc analysis beyond the existing monthly breakdown (which is locked to a single month at a time).
- Support filtering by type, date range, category, subcategory, tags, account, and name search -- all optional and composable.
- Deliver results in three tiers: summary cards (total + count), breakdown bars (one level deeper than the selected category), and a paginated transaction list.
- Maintain existing codebase patterns: TanStack React Query hooks, React Hook Form + Zod, Shadcn/ui primitives, server-side aggregation via Prisma.

### Non-Goals (Out of Scope)

- Charts/graphs for the analyzer (pie, bar, line) -- the existing CategoryBreakdownChart already covers visual charting per month.
- Export to CSV/PDF.
- Saved/named filter presets.
- Transfer transactions (only expense and income).
- Real-time auto-refresh while typing -- the user must click "Analyze" to trigger the query.

---

## 2. Scope

### In Scope

| Area | Details |
|------|---------|
| API endpoint | `GET /api/reports/transaction-analysis` with Zod-validated query params |
| Hook | `useTransactionAnalysis` in `src/hooks/useTransactionAnalysis.ts` |
| Zod schema | `src/lib/validations/transaction-analysis.ts` |
| Types | `src/types/transaction-analysis.ts` |
| Component | `src/components/reports/TransactionAnalyzer.tsx` (self-contained) |
| Page integration | Add `<TransactionAnalyzer />` to `src/app/reports/page.tsx` below `<AnnualSummaryTable />` |

### Out of Scope

- Database schema changes (no migrations needed -- all data already exists).
- Modifications to existing hooks or API routes.
- New Shadcn/ui component installations (all required primitives are already present: `toggle-group`, `calendar`, `popover`, `command`, `badge`, `progress`, `select`, `card`, `form`, `input`, `button`, `checkbox`, `spinner`).

---

## 3. Technical Design

### 3.1 API Endpoint

**Route:** `GET /api/reports/transaction-analysis`
**File:** `src/app/api/reports/transaction-analysis/route.ts`

#### Query Parameters

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"expense"` or `"income"` | Yes | Determines which Prisma model to query |
| `startDate` | ISO date string | No | Inclusive lower bound on `date` |
| `endDate` | ISO date string | No | Inclusive upper bound on `date` (end of day) |
| `categoryId` | string (CUID) | No | `expenseTypeId` or `incomeTypeId` depending on `type` |
| `subcategoryId` | string (CUID) | No | Only valid when `type=expense` and `categoryId` is set |
| `tagIds` | comma-separated CUIDs | No | Filter transactions that have ANY of the specified tags |
| `accountId` | string (CUID) | No | Filter by `accountId` |
| `search` | string | No | Case-insensitive `contains` match on transaction `name` |
| `skip` | integer | No | Pagination offset for transaction list (default: 0) |
| `take` | integer | No | Pagination limit for transaction list (default: 5) |

#### Response Shape

```typescript
interface TransactionAnalysisResponse {
  type: "expense" | "income";
  totalAmount: number;
  transactionCount: number;
  breakdown: {
    id: string;
    name: string;
    amount: number;
    percentage: number;
  }[];
  transactions: {
    id: string;
    name: string;
    amount: number;       // always positive
    date: string;         // ISO string
    categoryName: string;
    subcategoryName?: string;
    accountName: string;
  }[];
  hasMore: boolean;
}
```

#### Server Logic

1. **Auth:** Require session via `auth.api.getSession({ headers: await headers() })`. Return 401 if missing.
2. **Validate:** Parse all query params through the Zod schema (see section 3.3). Return 400 on failure.
3. **Build `where` clause dynamically:**
   - Always include `userId` and `isInstallment: false` for expenses.
   - Conditionally add `date: { gte, lte }`, `expenseTypeId`/`incomeTypeId`, `expenseSubcategoryId`, `accountId`, `name: { contains, mode: 'insensitive' }`, `tags: { some: { id: { in: tagIds } } }`.
4. **Aggregation (totalAmount + transactionCount):** Use `db.[model].aggregate({ where, _sum: { amount: true }, _count: true })`.
5. **Breakdown:** Use `db.[model].groupBy` to aggregate by the next level:
   - No `categoryId` selected: group by `expenseTypeId`/`incomeTypeId`, join names from the type tables.
   - `categoryId` selected (expense only): group by `expenseSubcategoryId`, join names. Transactions without a subcategory go into an "Uncategorized" bucket.
   - `subcategoryId` selected: no breakdown needed (return empty array).
   - For income with `categoryId` selected: no subcategories exist, return empty array.
   - Sort breakdown by `amount` descending. Calculate percentages server-side: `(itemAmount / totalAmount) * 100`, rounded to 2 decimal places.
6. **Transaction list:** Use `db.[model].findMany` with the same `where`, plus `skip`, `take: take + 1` (to determine `hasMore`), `orderBy: { date: 'desc' }`, and `include` the related account, type, and (for expenses) subcategory.
7. **Return** the response as JSON with status 200.

### 3.2 Hook

**File:** `src/hooks/useTransactionAnalysis.ts`

```
useTransactionAnalysis(params: TransactionAnalysisParams)
```

- Uses `useQuery` from TanStack React Query.
- **`enabled: false`** -- the query is only triggered manually via `refetch()`.
- **Query key:** `['transactionAnalysis', params]` where `params` is the serialized filter object.
- **Stale time:** 5 minutes (`5 * 60 * 1000`), consistent with existing breakdown hooks.
- **`refetchOnWindowFocus: false`**, consistent with existing hooks.
- Returns `{ data, isLoading, isFetching, error, refetch }`.

The `params` type:

```typescript
interface TransactionAnalysisParams {
  type: "expense" | "income";
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagIds?: string[];
  accountId?: string;
  search?: string;
  skip?: number;
  take?: number;
}
```

The fetch function builds a `URLSearchParams` from the params object, joining `tagIds` with commas.

### 3.3 Zod Validation Schema

**File:** `src/lib/validations/transaction-analysis.ts`

Server-side schema for query param validation:

```typescript
const transactionAnalysisSchema = z.object({
  type: z.enum(["expense", "income"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().min(1).optional(),
  subcategoryId: z.string().min(1).optional(),
  tagIds: z.string().optional(),          // comma-separated, split + validate in route
  accountId: z.string().min(1).optional(),
  search: z.string().max(100).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(5),
});
```

Client-side form schema (for React Hook Form):

```typescript
const transactionAnalysisFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  accountId: z.string().optional(),
  search: z.string().max(100).optional(),
});
```

### 3.4 Types

**File:** `src/types/transaction-analysis.ts`

Contains the `TransactionAnalysisResponse`, `TransactionAnalysisParams`, and form schema inferred types. Shared between API route, hook, and component.

### 3.5 Component

**File:** `src/components/reports/TransactionAnalyzer.tsx`

Self-contained component. Internal structure:

1. **Filter form** (React Hook Form, `useForm` with Zod resolver)
2. **Results panel** (conditional, shown after first successful query)

---

## 4. UI Design

### 4.1 Overall Layout

The component is wrapped in a Shadcn `Card` with `CardHeader` and `CardContent`, constrained to `max-w-5xl` to match the existing Category Breakdown card on the reports page.

```
<Card className="max-w-5xl">
  <CardHeader>
    <CardTitle className="text-sm md:text-base font-semibold">
      Transaction Analyzer
    </CardTitle>
    <CardDescription className="text-xs md:text-sm">
      Filter and analyze your transactions
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Filter Form */}
    {/* Results (conditional) */}
  </CardContent>
</Card>
```

### 4.2 Filter Form

#### Transaction Type Toggle (Row 1, full width)

- Shadcn `ToggleGroup` with `type="single"` and `variant="outline"`.
- Two items: "Expense" and "Income". Default value: `"expense"`.
- When toggled, reset `categoryId`, `subcategoryId` fields (since categories differ between types).

#### Filter Grid (Rows 2+)

Desktop (`md:` breakpoint and above): **2-column grid** (`grid grid-cols-1 md:grid-cols-2 gap-4`).

Mobile: single column, all filters stacked naturally.

| Position | Filter | Component | Notes |
|----------|--------|-----------|-------|
| Row 2, Col 1 | Start Date | `Popover` + `Calendar` (date picker pattern) | Label: "From". Placeholder: "Start date" |
| Row 2, Col 2 | End Date | `Popover` + `Calendar` | Label: "To". Placeholder: "End date" |
| Row 3, Col 1 | Category | `Select` | Label: "Category". Options from `useExpenseTypesQuery` (budgets) or `useIncomeTypesQuery` (incomeTypes) depending on type toggle. First option: "All categories" with value `""`. |
| Row 3, Col 2 | Subcategory | `Select` | Label: "Subcategory". **Only visible** when type is `"expense"` AND a category is selected. Options: subcategories from the selected expense type's `subcategories` array. First option: "All subcategories" with value `""`. |
| Row 4, Col 1 | Tags | `Popover` + `Command` combobox with `Checkbox` items | Label: "Tags". Selected tags shown as `Badge` pills below the trigger. Uses `useTagsQuery` for data. |
| Row 4, Col 2 | Account | `Select` | Label: "Account". Options from `useAccountsQuery`. First option: "All accounts" with value `""`. |
| Row 5, full span | Name Search | `Input` with search icon (Lucide `Search`) | Label: "Search by name". `md:col-span-2` on desktop. Placeholder: "Transaction name..." |

#### Action Buttons (below filter grid)

- **"Analyze" button:** `Button` with `variant="default"`. Disabled when the form has NO active filters beyond the type toggle (i.e., at minimum the type must be set, which it always is, but the button should be enabled as long as type is set -- since filtering all expenses or all income is valid). Shows `Spinner` + "Analyzing..." text while `isFetching` is true.
- **"Clear Filters" button:** `Button` with `variant="ghost"`. Only visible when at least one filter beyond type is active. Resets all fields to defaults (type stays, everything else clears). Also clears results.

Both buttons in a `flex` row with `gap-2`, right-aligned on desktop (`justify-end`).

### 4.3 Results Panel

Shown only after a successful query (not on initial mount). Wrapped in a `div` with `space-y-6`.

#### Active Filters Display

A `flex flex-wrap gap-2` row of `Badge` pills (variant `"secondary"`) showing each active filter. Each badge has an `X` button (Lucide `X` icon) that removes that specific filter and automatically re-triggers the analysis.

Format examples:
- "Expense" (type -- always shown, not removable)
- "Mar 1, 2026 - Mar 25, 2026" (date range)
- "Food & Dining" (category)
- "Restaurants" (subcategory)
- "Tag: Vacation" (each tag gets its own badge)
- "Account: BPI Savings" (account)
- "Search: coffee" (name search)

#### Summary Cards

Two small `Card` components side by side in a `grid grid-cols-2 gap-4`:

1. **Total Amount** -- Label: "Total Amount", Value: Philippine Peso formatted (`new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalAmount)`). Text size: `text-xl md:text-2xl font-bold`.
2. **Transaction Count** -- Label: "Transactions", Value: count number. Same text sizing.

Both cards: `p-4`, `text-center`.

#### Breakdown Section

Heading: "Breakdown by [Category/Subcategory]" (text adapts based on breakdown level).

- **No category selected:** heading says "Breakdown by Category"
- **Category selected (expense):** heading says "Breakdown by Subcategory"
- **Subcategory selected or income with category:** this section is hidden entirely.

Each breakdown row is a `div` with:
- Category/subcategory name (left-aligned, `text-sm font-medium`)
- Amount + percentage (right-aligned, `text-sm text-muted-foreground`)
- `Progress` bar below the text row, colored with HSL distribution: `hsl((index * 360) / total, 65%, 60%)` -- same formula as `CategoryBreakdownChart`.
- The `Progress` value = item's percentage.

Rows sorted by amount descending (server provides this ordering).

#### Transaction List

Heading: "Matching Transactions"

A simple list (not a full TanStack Table -- this is a lightweight display, not an editable grid). Each row:

```
<div className="flex items-center justify-between py-3 border-b">
  <div>
    <p className="text-sm font-medium">{name}</p>
    <p className="text-xs text-muted-foreground">
      {categoryName}{subcategoryName ? ` > ${subcategoryName}` : ''} -- {accountName}
    </p>
  </div>
  <div className="text-right">
    <p className="text-sm font-medium">{formattedAmount}</p>
    <p className="text-xs text-muted-foreground">{formattedDate}</p>
  </div>
</div>
```

Initially shows up to 5 transactions. A "Load More" `Button` (`variant="outline"`, `size="sm"`) appears at the bottom when `hasMore` is true. Clicking it increments `skip` by 10 and appends the new transactions to the existing list (accumulated client-side). Shows `Spinner` while loading more.

#### Empty State

When `transactionCount === 0`, show the `EmptyState` component with `variant="widget"`:
- Icon: `SearchX` from Lucide
- Title: "No transactions found"
- Description: "Try adjusting your filters to find what you're looking for."

#### Error State

When the query errors, show a simple error message with a "Retry" button.

### 4.4 Loading State

While the initial analysis is loading (after clicking Analyze), show:
- Summary cards area: two `Skeleton` rectangles in the 2-col grid.
- Breakdown area: 3-4 `Skeleton` bars.
- Transaction list: 3 `Skeleton` rows.

---

## 5. Data Dependencies

All required data hooks already exist:

| Data Need | Existing Hook | Query Key | Notes |
|-----------|--------------|-----------|-------|
| Expense types (categories) | `useExpenseTypesQuery` | `['budgets']` | Returns `budgets` array with `id`, `name`, `subcategories[]` |
| Income types | `useIncomeTypesQuery` | `['incomeTypes']` | Returns `incomeTypes` array with `id`, `name` |
| Tags | `useTagsQuery` | `['tags']` | Returns `tags` array with `id`, `name`, `color` |
| Accounts | `useAccountsQuery` | `['accounts', { includeCards }]` | Returns `accounts` array with `id`, `name` |

**No new data hooks are needed** for the filter dropdowns. The `useExpenseTypesQuery` already includes subcategories nested under each expense type.

The only new hook is `useTransactionAnalysis` for the analysis results themselves.

---

## 6. Verification Plan

### 6.1 Build Verification

- `npm run lint` passes with zero errors.
- `npm run build` passes with zero errors.

### 6.2 Functional Verification (Manual)

1. Navigate to `/reports`. Scroll down past Annual Summary. The Transaction Analyzer card should be visible.
2. With default "Expense" type, click "Analyze". Should return all non-installment expenses with correct total and breakdown by expense type.
3. Toggle to "Income", click "Analyze". Should return all income with breakdown by income type. Category and subcategory dropdowns should update.
4. Select a date range (start + end), click "Analyze". Results should be filtered to that range.
5. Select a specific expense type, verify subcategory dropdown appears. Select "All subcategories", click Analyze. Breakdown should now show subcategories.
6. Select a specific subcategory. Breakdown section should disappear (no deeper level).
7. Select multiple tags. Results should include transactions with ANY of those tags.
8. Select an account. Results filtered to that account.
9. Type a search term. Results filtered by name.
10. Stack multiple filters together (e.g., date range + category + tags). Results should respect all filters.
11. Click "Clear Filters". All filters reset, results cleared.
12. Remove an individual filter badge. Analysis re-runs without that filter.
13. On a filter combination with many results, verify "Load More" works and appends transactions.
14. On a filter combination with zero results, verify the empty state renders.
15. Test on mobile viewport (< 768px): filters should stack single-column. Summary cards remain 2-col.

### 6.3 Edge Cases

- No transactions exist at all: empty state on any analysis.
- Only the type toggle is set (no other filters): returns ALL transactions of that type. This is valid.
- `startDate` after `endDate`: API should still work (Prisma returns empty). No client-side date validation enforcement needed beyond valid Date objects.
- Subcategory filter with an expense type that has no subcategories: dropdown shows only "All subcategories".

---

## 7. Handoff Note for Builder

### Key Patterns to Follow

1. **API route pattern:** Follow `src/app/api/reports/expense-breakdown/route.ts` for auth, error handling, and response format. Use `export const dynamic = 'force-dynamic'`.
2. **Hook pattern:** Follow `useExpenseBreakdown.ts` for query structure. Key difference: `enabled: false` + manual `refetch()`.
3. **Validation pattern:** Follow `src/lib/validations/expense-transactions.ts` for Zod schema structure.
4. **HSL color generation:** Copy the `generateColor` function from `CategoryBreakdownChart.tsx`: `hsl((index * 360) / total, 65%, 60%)`.
5. **Currency formatting:** Use `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` -- search the codebase for existing usage to match exact format.
6. **EmptyState:** Use variant `"widget"` from `src/components/shared/EmptyState.tsx`.
7. **Card styling:** The reports page uses `money-map-card` class for the Category Breakdown section. However, for the Transaction Analyzer, use the Shadcn `Card` + `CardHeader` + `CardContent` components directly, which is the standard pattern for structured sections.

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/transaction-analysis.ts` | Shared types for API response and params |
| `src/lib/validations/transaction-analysis.ts` | Zod schemas (server + client) |
| `src/app/api/reports/transaction-analysis/route.ts` | API endpoint |
| `src/hooks/useTransactionAnalysis.ts` | TanStack React Query hook |
| `src/components/reports/TransactionAnalyzer.tsx` | Main component |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/reports/page.tsx` | Import and render `<TransactionAnalyzer />` below `<AnnualSummaryTable />` |

### No Database Changes Required

All required models and relations already exist in the Prisma schema. No migrations needed.

---

## 8. UI Improvements (Phase 7)

This section specifies UI/UX improvements to the TransactionAnalyzer component, informed by research into fintech dashboard best practices, WCAG accessibility guidelines, and existing codebase patterns.

### 8.1 Animated Subcategory Field Reveal

**Problem:** The subcategory field snaps in/out without transition when a category with subcategories is selected.

**Solution:** Use the `grid-template-rows: 0fr → 1fr` CSS technique already in the codebase (`.nav-group-content` in `globals.css` lines 237-247).

- Add a `.field-reveal` / `.field-reveal[data-visible="true"]` CSS class pair in `globals.css` using `grid-template-rows: 0fr → 1fr` with `200ms ease-out`.
- The subcategory field stays in the DOM always (not conditionally rendered). The grid animation handles visibility.
- The inner wrapper div must have `overflow: hidden`.
- Add `.field-reveal` to the existing `prefers-reduced-motion` media query block.

**Anti-patterns:** Do NOT use `max-height` with a large arbitrary value. Do NOT conditionally mount/unmount the element.

### 8.2 Mobile Form Density

**Problem:** The form feels too spacious on mobile, pushing results far down.

**Solution:** Reduce spacing (not font sizes — iOS Safari auto-zooms inputs below 16px).

- Grid gap: `gap-3 md:gap-4` (was `gap-4`)
- Form section spacing: `space-y-3 md:space-y-4` (was `space-y-4`)
- Labels can remain at their current size since they are non-interactive.
- Touch targets must remain ≥ 24×24 CSS pixels (WCAG 2.5.8).

### 8.3 Collapsible "More Filters" Section (Mobile)

**Problem:** All filter fields are visible at all times, creating a long form on mobile.

**Solution:** Group filters into two tiers. The "More Filters" section is collapsible on mobile, always visible on desktop.

**Tier 1 (always visible):**
- Type toggle (expense/income)
- Date range (From / To)
- Category (and Subcategory when applicable)

**Tier 2 (collapsible "More Filters"):**
- Tags
- Account
- Search by name

**Implementation:**
- A clickable header/trigger that reads "More Filters" with a chevron indicator.
- When Tier 2 filters are active, show count: "More Filters **(2 active)**".
- Uses the same `.field-reveal` CSS grid animation from 8.1.
- Default state on mobile: **collapsed**. Default on desktop: always expanded (no collapsing — use `md:` breakpoint to only collapse on mobile).
- The "More Filters" trigger should use `h-9` minimum touch target and show a `ChevronDown`/`ChevronUp` icon.

### 8.4 Interactive Filter Pills

**Problem:** Active filter badges have no hover/focus states — no visual affordance that they can be clicked to remove.

**Solution:** Add interaction states to the dismiss button and pill body:

- **Pill body:** Add `hover:bg-secondary/80` and `transition-colors duration-150`.
- **Dismiss (X) button:**
  - `cursor-pointer`
  - Wrap X icon in `rounded-full p-0.5` container
  - `hover:bg-foreground/10`
  - `focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none`
  - `transition-colors duration-150`
  - `active:scale-95` for tactile feedback
- Only the X triggers removal, not the entire pill body.

### 8.5 Results Summary Sentence

**Problem:** Results show raw numbers without contextual interpretation. Transaction count takes up a full summary card for low-value information.

**Solution:** Add a natural language summary sentence above the summary cards that merges the date context (item 3), summary sentence (item 5), and transaction count (item 6) into one.

**Format:**
- Base: `You spent **PHP 12,345.67** across **42 transactions**`
- With category: `You spent **PHP 12,345.67** across **42 transactions** on **Food & Dining**`
- With category + subcategory: `You spent **PHP 12,345.67** across **42 transactions** on **Food & Dining > Restaurants**`
- With account: `You spent **PHP 12,345.67** across **42 transactions** in **BPI Savings**`
- With category + account: `You spent **PHP 12,345.67** across **42 transactions** on **Food & Dining** in **BPI Savings**`
- With dates: `You spent **PHP 12,345.67** across **42 transactions** from **Mar 1** to **Mar 25, 2026**`
- With only start date: `...since **Mar 1, 2026**`
- With only end date: `...up to **Mar 25, 2026**`
- Full: `You spent **PHP 12,345.67** across **42 transactions** on **Food & Dining > Restaurants** in **BPI Savings** from **Mar 1** to **Mar 25, 2026**`
- Income: `You earned **PHP 45,000.00** from **3 transactions**`

**Sentence structure:** `You [spent/earned] [amount] across [count] [on [category [> subcategory]]] [in [account]] [date clause]`

Each segment is independently conditional — omitted filters produce no text. Tags and name search are NOT included in the sentence (they remain visible in the filter pills above).

**Preposition rules:**
- Category/subcategory uses "on": `on Food & Dining`
- Account uses "in": `in BPI Savings`
- Dates use "from/to", "since", or "up to"

**Styling:** `text-sm md:text-base text-muted-foreground`. Dynamic values use `font-medium text-foreground` for emphasis.

**Placement:** Between the ActiveFilters pills and the Summary Cards.

### 8.6 Replace Transaction Count Card with Average Per Transaction

**Problem:** Transaction count gets equal visual weight to total amount but provides less actionable insight.

**Solution:** Replace the "Transactions" summary card with "Avg. per Transaction".

- Value: `totalAmount / transactionCount`, formatted as PHP currency.
- Label: "Avg. per Transaction"
- Same styling as the Total Amount card.
- This is a client-side computation — no API changes needed.
- Transaction count is already communicated in the summary sentence (8.5).

### 8.7 Load More Improvements

**Problem:** The Load More button shows generic text and a spinner that replaces the button text.

**Solution:**
1. **Button text:** Show remaining count: `"Load More (37 remaining)"` computed as `data.transactionCount - accumulatedTransactions.length`.
2. **Loading indicator:** While loading, show 2-3 `Skeleton` rows (`h-[52px]` to match transaction row height) below the existing list, in addition to disabling the button with a spinner.
3. The button remains visible (disabled + spinner) during loading — do not hide it.

### 8.8 Visual Section Breaks

**Problem:** The form flows directly into results with no visual break. Result sub-sections (breakdown, transactions) also lack clear separation.

**Solution:**

1. **Form → Results divider:** Add a Shadcn `<Separator />` with `my-6` between the Analyze button area and the results section.
2. **Sub-section headings:** Add a left border accent to "Breakdown by Category" and "Matching Transactions" headings:
   ```
   border-l-2 border-primary/40 pl-3
   ```
3. **Results background:** Wrap the entire results section (after the separator) in a `rounded-lg bg-muted/20 p-4` container to visually distinguish "output" from "input".

### 8.9 Accessibility

All animated elements (field reveal, collapsible section) must be included in the existing `@media (prefers-reduced-motion: reduce)` block in `globals.css` with `transition: none !important`.
