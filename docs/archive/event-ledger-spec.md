# Event Ledger — Feature Specification

> **Status:** Ready for Builder
> **Author:** Architect
> **Date:** 2026-04-25
> **Branch:** `feature/event-ledger`
> **Discussion Log:** `docs/event-ledger-log.md`

---

## 1. Objectives

Add an **Event Ledger** component to the reports page that lets users select tags and see the **net cost** of an event across expense, income, and transfer transactions — answering "what did this actually cost me?"

### Goals

- Provide net-cost analysis for events that span both expenses and income (split bills, reimbursements, trips, side projects).
- Use tags as the primary grouping mechanism — the only entity that bridges all three transaction types in the schema.
- Include an inline "Add Transactions" search panel so users can find and tag missed transactions without leaving the ledger.
- Maintain existing codebase patterns: TanStack React Query hooks, React Hook Form + Zod, Shadcn/ui primitives, server-side aggregation via Prisma.

### Non-Goals (Out of Scope)

- Modifying the existing TransactionAnalyzer component.
- Database schema changes (tags already bridge all transaction types).
- Transfer transaction support in v1 (see section 7 — future consideration).
- Auto-suggestion algorithms for untagged transactions.
- Tag creation from within the Event Ledger (users create tags via existing flows).
- Export to CSV/PDF.

---

## 2. Scope

### In Scope

| Area | Details |
|------|---------|
| API endpoint | `GET /api/reports/event-ledger` — queries both expense and income transactions by tag IDs, returns aggregated totals and transaction list |
| Tag API endpoint | `PATCH /api/reports/event-ledger/tag` — adds a tag to a transaction (calls existing PATCH endpoints internally) |
| Hook | `useEventLedger` in `src/hooks/useEventLedger.ts` |
| Zod schema | `src/lib/validations/event-ledger.ts` |
| Types | `src/types/event-ledger.ts` |
| Component | `src/components/reports/EventLedger.tsx` (self-contained) |
| Page integration | Add `<EventLedger />` to `src/app/reports/page.tsx` above `<TransactionAnalyzer />` |

### Out of Scope

- Database schema changes (no migrations needed).
- Modifications to existing transaction PATCH endpoints.
- New Shadcn/ui component installations (all required primitives already present).

---

## 3. Technical Design

### 3.1 API Endpoint — Event Ledger Query

**Route:** `GET /api/reports/event-ledger`
**File:** `src/app/api/reports/event-ledger/route.ts`

#### Query Parameters

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `tagIds` | comma-separated CUIDs | Yes | At least one tag required. Transactions with ANY of these tags are included (OR logic). |
| `startDate` | ISO date string | No | Inclusive lower bound on `date` |
| `endDate` | ISO date string | No | Inclusive upper bound on `date` (end of day) |
| `accountId` | string (CUID) | No | Filter by `accountId` |
| `skip` | integer | No | Pagination offset (default: 0) |
| `take` | integer | No | Pagination limit (default: 10) |

#### Response Shape

```typescript
interface EventLedgerResponse {
  totalExpenses: number;
  totalIncome: number;
  netAmount: number; // totalExpenses - totalIncome (positive = net cost, negative = net gain)
  expenseCount: number;
  incomeCount: number;
  transactions: EventLedgerTransaction[];
  hasMore: boolean;
}

interface EventLedgerTransaction {
  id: string;
  name: string;
  amount: number; // always positive
  type: "expense" | "income";
  date: string; // ISO string
  categoryName: string;
  subcategoryName?: string;
  accountName: string;
  tags: { id: string; name: string; color: string }[];
}
```

#### Server Logic

1. **Auth:** Require session. Return 401 if missing.
2. **Validate:** Parse query params through Zod schema. Return 400 if `tagIds` is empty.
3. **Two parallel aggregate queries:**
   - `db.expenseTransaction.aggregate` with `where: { userId, isInstallment: false, tags: { some: { id: { in: tagIdArray } } }, ...optionalFilters }` → `_sum.amount` + `_count`
   - `db.incomeTransaction.aggregate` with same tag/date/account filter → `_sum.amount` + `_count`
4. **Combined transaction list:** Two `findMany` queries (expense + income) with same filters, both including `account`, type relation, subcategory (expense only), and `tags`. Merge results, sort by `date` descending. Apply skip/take to the merged list.
   - For pagination: fetch `skip + take + 1` from each table, merge and sort, then slice. Set `hasMore = merged.length > skip + take`.
   - Map each transaction to the response shape with `type: "expense" | "income"`.
5. **Calculate net:** `netAmount = totalExpenses - totalIncome`.
6. **Return** JSON response.

### 3.2 API Endpoint — Quick-Tag

**Route:** `PATCH /api/reports/event-ledger/tag`
**File:** `src/app/api/reports/event-ledger/tag/route.ts`

This is a thin proxy that adds a tag to a transaction. It needs to know the transaction type to call the correct PATCH endpoint logic.

#### Request Body

```typescript
{
  transactionId: string;
  transactionType: "expense" | "income";
  tagId: string;
}
```

#### Server Logic

1. **Auth:** Require session. Return 401 if missing.
2. **Validate** request body.
3. **Fetch** the current transaction to get its existing `tags` array.
4. **Check** the tag isn't already on the transaction (return 200 no-op if so).
5. **Update** the transaction via Prisma: `db.[model].update({ where: { id, userId }, data: { tags: { connect: { id: tagId } } } })`.
6. **Return** 200 with the updated transaction.

### 3.3 Hook

**File:** `src/hooks/useEventLedger.ts`

```typescript
useEventLedger(params: EventLedgerParams)
```

- Uses `useQuery` with `enabled: false` (manual trigger via `refetch()`).
- Query key: `['eventLedger', params]`.
- Stale time: 5 minutes.
- Returns `{ data, isFetching, error, refetch }`.

Additionally, export a `useEventLedgerTag` mutation hook:

```typescript
useEventLedgerTag()
```

- Uses `useMutation` to call `PATCH /api/reports/event-ledger/tag`.
- On success, invalidates the `['eventLedger']` query to refresh results.
- Returns `{ addTag, isAdding }`.

### 3.4 Zod Validation

**File:** `src/lib/validations/event-ledger.ts`

Server-side query schema:

```typescript
const eventLedgerQuerySchema = z.object({
  tagIds: z.string().min(1, "At least one tag is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().min(1).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(10),
});
```

Server-side tag mutation schema:

```typescript
const eventLedgerTagSchema = z.object({
  transactionId: z.string().min(1),
  transactionType: z.enum(["expense", "income"]),
  tagId: z.string().min(1),
});
```

Client-side form schema:

```typescript
const eventLedgerFormSchema = z.object({
  tagIds: z.array(z.string()).min(1),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  accountId: z.string().optional(),
});
```

### 3.5 Types

**File:** `src/types/event-ledger.ts`

Contains `EventLedgerResponse`, `EventLedgerTransaction`, `EventLedgerParams`, and form schema inferred types.

---

## 4. UI Design

### 4.1 Overall Layout

Wrapped in a Shadcn `Card` matching the existing reports page style.

```
<Card>
  <CardHeader>
    <CardTitle>Event Ledger</CardTitle>
    <CardDescription>
      See the real cost of an event by combining expenses and income under the same tags
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Tag Selection + Filters */}
    {/* Results (conditional) */}
    {/* Add Transactions Panel (conditional) */}
  </CardContent>
</Card>
```

### 4.2 Filter Form

#### Tag Selection (Primary — Required)

- Reuse the existing `Popover` + `Command` multi-select pattern from TransactionAnalyzer's tag filter.
- Selected tags shown as colored `Badge` pills below the trigger.
- Label: "Select Tags". This is the only required filter.

#### Optional Filters (Single Row)

A compact row with date range and account — similar to TransactionAnalyzer's Tier 1 but without category/subcategory:

| Filter | Component | Notes |
|--------|-----------|-------|
| Start Date | `Popover` + `Calendar` | Label: "From" |
| End Date | `Popover` + `Calendar` | Label: "To" |
| Account | `Select` | Label: "Account". "All accounts" default. |

#### Action Buttons

- **"View Ledger"** button (default variant). Disabled when no tags selected or while fetching. Shows spinner while loading.
- **"Clear"** button (ghost variant). Visible when any filter is active.

### 4.3 Results Panel

Shown after first successful query. Wrapped in `rounded-lg bg-muted/20 p-3 md:p-4`.

#### Summary Section

Three stat cards in a `grid grid-cols-3 gap-3`:

1. **Total Expenses** — red text accent. Label: "Expenses". Value: formatted PHP amount.
2. **Total Income** — green text accent. Label: "Income". Value: formatted PHP amount.
3. **Net Amount** — Label: "Net Cost" (if positive) or "Net Gain" (if negative). Value: formatted PHP amount. Color: red if positive (net cost), green if negative (net gain).

Below the cards, a summary sentence:
- `"You spent **₱3,000** and received **₱1,500** across **3 transactions** — net cost of **₱1,500**"`

#### Transaction List

Each transaction row:

```
<div className="flex items-center justify-between py-3 border-b">
  <div>
    <div className="flex items-center gap-2">
      <span className={type === "expense" ? "text-red-500" : "text-green-500"}>
        {type === "expense" ? "−" : "+"}
      </span>
      <p className="text-sm font-medium">{name}</p>
    </div>
    <p className="text-xs text-muted-foreground">
      {categoryName}{subcategoryName ? ` > ${subcategoryName}` : ''} · {accountName}
    </p>
  </div>
  <div className="text-right">
    <p className={cn("text-sm font-medium", type === "expense" ? "text-red-500" : "text-green-500")}>
      {type === "expense" ? "−" : "+"}₱{formattedAmount}
    </p>
    <p className="text-xs text-muted-foreground">{formattedDate}</p>
  </div>
</div>
```

Transactions sorted by date descending. "Load More" button with remaining count when `hasMore` is true.

#### Empty State

When no transactions found: `EmptyState` with `variant="widget"`, icon `SearchX`, title "No transactions found", description "No transactions match the selected tags."

### 4.4 "Add Transactions" Panel

A button below the results: **"Add Transactions"** (outline variant, with `Plus` icon).

Clicking it reveals an inline search panel (using `.field-reveal` animation if it exists, otherwise simple conditional render):

#### Search Filters

A compact filter row within the panel:

| Filter | Component | Notes |
|--------|-----------|-------|
| Type | `ToggleGroup` single: "Expense" / "Income" | Defaults to "Expense" |
| Date Range | Two `Popover` + `Calendar` | "From" / "To" |
| Category | `Select` | Dynamic based on type toggle (expense types or income types) |
| Account | `Select` | "All accounts" default |
| Search | `Input` with search icon | "Search by name..." |

A **"Search"** button triggers the query.

#### Search Results

Uses the existing `/api/reports/transaction-analysis` endpoint (already built) to fetch matching transactions. Results display in a compact list, each row showing:

- Transaction name, category, account, amount, date
- An **"Add Tag"** button (small, outline) on each row
- Transactions that already have any of the selected Event Ledger tags are **excluded** from results (filtered client-side or via API)

Clicking "Add Tag":
1. Calls `PATCH /api/reports/event-ledger/tag` with the transaction ID, type, and the first selected tag ID.
2. Optimistic update: immediately moves the transaction from the search results to the ledger results.
3. Refreshes the ledger totals.

#### Close Panel

An "X" button or "Done" button to collapse the search panel.

---

## 5. Data Dependencies

### Existing Hooks (Reused)

| Data Need | Existing Hook | Notes |
|-----------|--------------|-------|
| Tags | `useTagsQuery` | Tag list for selection |
| Accounts | `useAccountsQuery` | Account filter dropdown |
| Expense types | `useExpenseTypesQuery` | Category filter in search panel |
| Income types | `useIncomeTypesQuery` | Category filter in search panel |
| Transaction search | `useTransactionAnalysis` | Reused for the "Add Transactions" search panel |

### New Hooks

| Hook | Purpose |
|------|---------|
| `useEventLedger` | Fetches event ledger results by tags |
| `useEventLedgerTag` | Mutation to add a tag to a transaction |

---

## 6. Verification Plan

### 6.1 Build Verification

- `npm run lint` passes with zero errors.
- `npm run build` passes with zero errors.

### 6.2 Functional Verification (Manual)

1. Navigate to `/reports`. Event Ledger card is visible above Transaction Analyzer.
2. Without selecting tags, "View Ledger" button is disabled.
3. Select one tag. Click "View Ledger". Results show all expense and income transactions with that tag.
4. Verify summary: Total Expenses, Total Income, and Net Amount are correct.
5. Verify transactions are color-coded (red for expense, green for income) and sorted by date.
6. Select multiple tags. Results include transactions with ANY of those tags (OR logic).
7. Add date range filter. Results respect the date bounds.
8. Add account filter. Results filtered to that account.
9. Clear filters. All filters reset, results cleared.
10. Click "Add Transactions". Search panel opens.
11. Search for a transaction by name. Results appear.
12. Click "Add Tag" on a result. Tag is added, transaction appears in ledger, totals update.
13. The tagged transaction no longer appears in search results.
14. Test "Load More" pagination in both the ledger results and search results.
15. Test empty state when no transactions match selected tags.

### 6.3 Edge Cases

- Tag with only expenses (no income): Net Amount equals Total Expenses. Income shows ₱0.
- Tag with only income: Net Amount is negative (net gain).
- Transaction already has the tag: "Add Tag" is a no-op, handled gracefully.
- No tags exist yet: Tag selector shows empty state.

---

## 7. Future Considerations

- **Transfer transactions:** Could be included in a future version. The question is whether a transfer counts as expense or income — it depends on direction (from vs to account). Deferred to avoid scope creep.
- **Multi-tag AND logic:** A toggle to switch between OR (any tag) and AND (all tags) could be added later.
- **Tag-based reports over time:** "Show me my net cost for tag X month by month" — a time-series view.

---

## 8. Handoff Note for Builder

### Key Patterns to Follow

1. **API route pattern:** Follow `src/app/api/reports/transaction-analysis/route.ts` for auth, error handling, and response format.
2. **Hook pattern:** Follow `src/hooks/useTransactionAnalysis.ts` for query structure with `enabled: false`.
3. **Validation pattern:** Follow `src/lib/validations/transaction-analysis.ts` for Zod schema structure.
4. **Tag multi-select pattern:** Reuse the `Popover` + `Command` + `Checkbox` pattern from TransactionAnalyzer's tag filter.
5. **Currency formatting:** Use `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.
6. **Color-coding:** Expense amounts in `text-red-500`, income in `text-green-500`. Check existing Tailwind config for any custom color tokens first.
7. **EmptyState:** Use variant `"widget"` from `src/components/shared/EmptyState.tsx`.
8. **Quick-tag mutation:** Use `tags: { connect: { id: tagId } }` — NOT `{ set: [...] }` — to append without removing existing tags.

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/event-ledger.ts` | Shared types |
| `src/lib/validations/event-ledger.ts` | Zod schemas |
| `src/app/api/reports/event-ledger/route.ts` | Ledger query endpoint |
| `src/app/api/reports/event-ledger/tag/route.ts` | Quick-tag endpoint |
| `src/hooks/useEventLedger.ts` | Query + mutation hooks |
| `src/components/reports/EventLedger.tsx` | Main component |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/reports/page.tsx` | Import and render `<EventLedger />` above `<TransactionAnalyzer />` |

### No Database Changes Required

Tags already have many-to-many relations with all transaction types. Existing PATCH endpoints support `tagIds`. Zero migrations needed.
