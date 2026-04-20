# Installment Management — Specification

> **Feature:** Add an Installments tab to the Expenses page for viewing, editing, and deleting installment parent transactions.
> **Status:** Ready for Builder
> **Handoff protocol:** `.claude/conventions/handoff-protocol.md`

---

## 1. Objectives & Scope

### In scope

- Surface parent installment records (`isInstallment: true`, excluding `CANCELLED`) in a dedicated Installments tab on the Expenses page.
- Provide full management (view, edit, delete) of parent installments.
- Add three new API routes under `/api/installments` for list / update / delete.
- Replace the existing soft-cancel behavior in `DELETE /api/expense-transactions/[id]` with a 400 rejection for parent installments.
- Add a new hook `useInstallmentsQuery` with TanStack React Query.
- Add responsive UI: desktop table + mobile card list.
- Provide an `EditInstallmentDrawer` shared across mobile and desktop.

### Out of scope

- Modifying how the Transactions tab renders (no changes to existing behavior).
- Modifying the installment creation flow.
- Modifying the cron that generates child payments (`src/app/api/cron/process-installments/route.ts`).
- Adding a filter for `CANCELLED` installments (they are always hidden in this feature).
- URL-persisted tab state.
- Editing the `installmentDuration`, `accountId`, or `tagIds` fields on a parent installment.

---

## 2. Context Pointers

### Existing patterns to follow

| Concern | Reference file |
|---|---|
| Tabs usage (line variant) | `src/app/reports/page.tsx` |
| Desktop table layout | `src/components/tables/expenses/ExpenseTable.tsx` |
| Mobile card layout | `src/components/shared/ExpenseCard.tsx` |
| Edit drawer w/ skeleton + delete | `src/components/forms/EditExpenseDrawer.tsx` |
| Delete confirmation dialog | `src/components/shared/DeleteDialog.tsx` |
| Query hook structure | `src/hooks/useExpenseTransactionsQuery.ts` |
| API PATCH / DELETE pattern | `src/app/api/expense-transactions/[id]/route.ts` |
| API GET list pattern | `src/app/api/expense-transactions/route.ts` |
| Statement recalculator hook | `onExpenseTransactionChange` from `@/lib/statement-recalculator` |
| Tabs primitive | `src/components/ui/tabs.tsx` |
| Installment status constants | `INSTALLMENT_STATUS` in `src/app/api/expense-transactions/[id]/route.ts` |

### Database (existing columns — no migration required)

Parent installment rows in `ExpenseTransaction` already have:

- `isInstallment: true`
- `installmentDuration` — total number of payments
- `remainingInstallments` — remaining count
- `installmentStartDate` — first payment date
- `monthlyAmount` — derived (`amount / installmentDuration`)
- `lastProcessedDate` — updated by the cron after each monthly payment
- `installmentStatus` — `"ACTIVE"` | `"COMPLETED"` | `"CANCELLED"` (default `"ACTIVE"`)
- `date` — set to `installmentStartDate` at creation

Child payments have `parentInstallmentId = <parent id>`, `isInstallment: false`, `isSystemGenerated: true`.

**No Prisma schema changes needed.** No migration will be run.

---

## 3. API Design

### 3.1 `GET /api/installments`

**Auth:** Better Auth session required. 401 if missing.

**Query params:**

| Name | Type | Default | Notes |
|---|---|---|---|
| `status` | `"ACTIVE"` \| `"ALL"` | `"ACTIVE"` | `ALL` returns `ACTIVE` + `COMPLETED` (never `CANCELLED`). |

**Behavior:**

1. Parse the `status` param. If absent or `"ACTIVE"`, filter `installmentStatus = "ACTIVE"`. If `"ALL"`, filter `installmentStatus IN ("ACTIVE", "COMPLETED")`. Any other value → 400.
2. Query `db.expenseTransaction.findMany` where:
   - `userId: session.user.id`
   - `isInstallment: true`
   - `installmentStatus` per rule above (explicitly excludes `CANCELLED`)
3. Include relations: `account`, `expenseType`, `expenseSubcategory`.
4. Order by `installmentStartDate DESC` (newest installments first).
5. Return `{ installments: [...] }` (array wrapped in an object for consistency with the existing expense-transactions list endpoint).

**Response shape (per row):**

Same as the Prisma `ExpenseTransaction` row plus included relations. The client derives `paidCount = installmentDuration - remainingInstallments` and `nextPaymentDate` locally — no extra API surface.

**Errors:** 400 for bad `status`, 401 unauthenticated, 500 for unexpected.

---

### 3.2 `PATCH /api/installments/[id]`

**Auth:** Better Auth session required. 401 if missing.

**Request body (Zod-validated):**

```ts
z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0).optional(),
  installmentStartDate: z.string().optional(), // ISO date string
  expenseTypeId: z.string().optional(),
  expenseSubcategoryId: z.string().nullable().optional(),
})
```

**Locked fields (must reject with 400 if present in body):**

- `installmentDuration`
- `accountId`
- `tagIds`
- `isInstallment`, `remainingInstallments`, `monthlyAmount`, `lastProcessedDate`, `installmentStatus`, `parentInstallmentId`, `isSystemGenerated` (any attempt to mutate internal state)

The Zod schema should use `.strict()` or explicitly check for disallowed keys and return `400 { error: "Field not editable: <name>" }`.

**Preconditions:**

1. Fetch `existing = db.expenseTransaction.findUnique({ where: { id, userId } })`. 404 if missing.
2. Require `existing.isInstallment === true`. Otherwise 400 with `{ error: "Not an installment" }`.
3. Require `existing.installmentStatus !== "CANCELLED"`. Otherwise 404 (cancelled installments are hidden and not editable).

**Subcategory validation:** Same as existing PATCH route — if `expenseSubcategoryId` is non-null, verify it exists and belongs to `expenseTypeId` (or to `existing.expenseTypeId` if `expenseTypeId` not being changed). Return 404 or 400 appropriately.

**Amount change logic:**

```
newAmount (total)      = parseFloat(amount)
newMonthlyAmount       = newAmount / existing.installmentDuration
updateData.amount          = newAmount
updateData.monthlyAmount   = newMonthlyAmount
```

- Past children are **not** updated (historical record).
- No account balance adjustment here. The next cron tick uses the new `monthlyAmount`.

**Start-date change logic (critical):**

Let `oldStart = existing.installmentStartDate`, `newStart = new Date(installmentStartDate)`. Normalize both to `00:00:00` local time before comparing.

**Case A — `newStart > oldStart` (moved forward):**

Inside a `db.$transaction(operations)` where `operations` is a `PrismaPromise[]`:

1. Fetch children: `const children = await db.expenseTransaction.findMany({ where: { parentInstallmentId: id, userId } })` **(outside the transaction, pre-read is fine — we just need the list)**.
2. Filter `childrenToDelete = children.filter(c => c.date < newStart)`.
3. For each child in `childrenToDelete`:
   - Push `db.financialAccount.update({ where: { id: child.accountId, userId }, data: { currentBalance: { increment: Number(child.amount) } } })`.
   - Push `db.expenseTransaction.delete({ where: { id: child.id } })`.
4. Push the parent update:
   ```
   db.expenseTransaction.update({
     where: { id, userId },
     data: {
       name?, amount?, monthlyAmount?, expenseTypeId?, expenseSubcategoryId?,
       installmentStartDate: newStart,
       date: newStart,
       remainingInstallments: existing.installmentDuration,  // full reset
       lastProcessedDate: null,
     },
   })
   ```
5. `await db.$transaction(operations)`.
6. `await onExpenseTransactionChange(existing.accountId, oldStart)` and `await onExpenseTransactionChange(existing.accountId, newStart)` — recalculate statement balance for both cycles affected.

**Case B — `newStart <= oldStart` (moved backward or unchanged):**

1. Push only the parent update (with the fields that changed). Do **not** touch children, `remainingInstallments`, or `lastProcessedDate`.
2. Still set `date = newStart`.
3. `await db.$transaction(operations)`.
4. `await onExpenseTransactionChange(existing.accountId, oldStart)` and `await onExpenseTransactionChange(existing.accountId, newStart)` (same as A — the cycles may differ).

**If `installmentStartDate` is not provided in the body:**

- Just update the other fields inside a `db.$transaction`.
- Call `onExpenseTransactionChange(existing.accountId, existing.date)` once.

**Response:** `200` with the updated parent row (including `account`, `expenseType`, `expenseSubcategory`).

**Errors:** 400 (bad input / locked field / not an installment / bad subcategory), 401, 404, 500.

---

### 3.3 `DELETE /api/installments/[id]`

**Auth:** Better Auth session required. 401 if missing.

**Preconditions:**

1. Fetch `existing = db.expenseTransaction.findUnique({ where: { id, userId } })`. 404 if missing.
2. Require `existing.isInstallment === true`. Otherwise 400 `{ error: "Not an installment" }`.
3. `installmentStatus === "CANCELLED"` → 404 (not visible).

**Behavior (atomic):**

1. Fetch all children: `const children = await db.expenseTransaction.findMany({ where: { parentInstallmentId: id, userId } })`.
2. Build `operations: PrismaPromise<unknown>[] = []`.
3. For each child where `child.isSystemGenerated` (or simply always — all children are system-generated payments):
   - Push `db.financialAccount.update({ where: { id: child.accountId, userId }, data: { currentBalance: { increment: Number(child.amount) } } })`.
4. Push `db.expenseTransaction.deleteMany({ where: { parentInstallmentId: id, userId } })`.
5. Push `db.expenseTransaction.delete({ where: { id, userId } })`.
6. `await db.$transaction(operations)`.
7. `await onExpenseTransactionChange(existing.accountId, existing.date)`.

**Response:** `200 { message: "Installment deleted successfully", deleted: true }`.

**Errors:** 400, 401, 404, 500.

---

### 3.4 Change to existing `DELETE /api/expense-transactions/[id]`

Replace the current soft-cancel block for `existingExpense.isInstallment` with a rejection:

```ts
if (existingExpense.isInstallment) {
  return NextResponse.json(
    { error: "Use DELETE /api/installments/[id] to delete an installment" },
    { status: 400 }
  );
}
```

Leave the rest of the DELETE handler (regular expenses, system-generated children) untouched.

The exported `INSTALLMENT_STATUS` constant must remain exported — it is imported in `src/app/api/expense-transactions/route.ts` and `src/app/api/cron/process-installments/route.ts`.

---

## 4. Client Layer

### 4.1 Hook: `src/hooks/useInstallmentsQuery.ts`

**Exports:**

```ts
export type Installment = { /* mirrors API row */ }
export const useInstallmentsQuery: (options?: { status?: 'ACTIVE' | 'ALL' }) => {
  installments: Installment[];
  isLoading: boolean;
  error: string | null;
  updateInstallment: (payload: { id: string; [k: string]: unknown }) => Promise<Installment>;
  deleteInstallment: (id: string) => void;
  deleteInstallmentAsync: (id: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}
export const useInstallmentQuery: (id: string, opts?: { enabled?: boolean }) => {
  installmentData: Installment | undefined;
  isFetching: boolean;
  error: string | null;
}
```

**Query keys:**

- `['installments']` — list, optionally suffixed with `[{ status }]`.
- `['installments', id]` — single row.

**Mutations invalidate:**

- `['installments']` (all variants)
- `['expenseTransactions']` (used by the Transactions tab — deleting a parent removes children)
- `RECENT_TRANSACTION_QUERY_KEYS.recentTransactions` (from `src/hooks/useRecentTransactions.ts`)
- `['accounts']`, `['cards']` (balance changes)
- `['netWorth']`, `['netWorthHistory']`, `['monthlySummary']`, `['budgetStatus']`, `['annualSummary']`, `['expenseBreakdown']` (all derived totals that read from expense transactions)

On `deleteInstallment` error, surface a toast:
`toast.error("Failed to delete installment", { description: errorMessage, duration: 6000 })`.

No optimistic updates are required for this feature (keeps complexity low — the list is short and mutations are fast).

---

### 4.2 Page: `src/app/expenses/page.tsx`

Wrap the existing page body in a `Tabs` component. Structure:

```tsx
<Tabs defaultValue="transactions" onValueChange={setActiveTab}>
  <TabsList variant="line">
    <TabsTrigger value="transactions">Transactions</TabsTrigger>
    <TabsTrigger value="installments">Installments</TabsTrigger>
  </TabsList>

  <TabsContent value="transactions">
    {/* Existing Expenses page body — unchanged */}
  </TabsContent>

  <TabsContent value="installments">
    <InstallmentsTabContent />
  </TabsContent>
</Tabs>
```

Tab state is local (`useState`), no URL sync. `defaultValue="transactions"`.

**`InstallmentsTabContent`** is either a new private component inside the same file or a separate file under `src/components/installments/InstallmentsTabContent.tsx` (prefer the separate file for testability). It:

- Maintains local state `showCompleted: boolean` (default `false`).
- Calls `useInstallmentsQuery({ status: showCompleted ? 'ALL' : 'ACTIVE' })`.
- Renders:
  - A toggle button / switch labeled **"Show completed"**. Use a `Switch` with label, or a `Toggle` styled as a ghost button. Pick the `Switch` pattern consistent with EditExpenseDrawer's `Switch` usage.
  - Desktop: `<InstallmentTable installments={installments} onEdit={...} onDelete={...} />`.
  - Mobile: list of `<InstallmentCard key={i.id} ... />`.
  - Skeleton while `isLoading` (reuse `SkeletonTable tableType="expense"` on desktop and `SkeletonExpenseCard` on mobile — or create lightweight local skeletons if columns differ too much).
  - `EmptyState` when `installments.length === 0 && !isLoading`. Icon: `CalendarClock` (from lucide-react). Title: `"No installments yet"`. Description: `"Installment purchases you create will appear here."` — no action button (creation is done via the existing expense form).
- Controls `EditInstallmentDrawer` with `selectedInstallmentId` state, same pattern as the existing Expenses page controls `EditExpenseDrawer`.

---

### 4.3 Component: `src/components/installments/EditInstallmentDrawer.tsx`

**Props:**

```ts
interface EditInstallmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installmentId: string;
}
```

**Structure (mirrors `EditExpenseDrawer`):**

1. Uses `Drawer` primitive (same usage — mobile bottom drawer / desktop works via Drawer too for consistency with EditExpenseDrawer).
2. Fetches installment via `useInstallmentQuery(installmentId, { enabled: open })`.
3. While `isFetching` → render `SkeletonEditExpenseDrawerForm` (reuse; fields are similar enough).
4. On error → render the same error state used in `EditExpenseDrawer`.
5. Form (React Hook Form + Zod resolver), fields:
   - **Name** — `Input`, required.
   - **Total amount** — `Input` `type="number"`. FormDescription below: `"Total: ₱{total} • Monthly: ₱{monthlyAmount derived}"` that updates live as the user types. Monthly derivation: `watchedAmount / installmentDuration`, formatted to 2 decimals in `PHP`.
   - **Account** — read-only text `<p>{installmentData.account.name}</p>` with a subtle disabled-field appearance (gray background, lock icon optional).
   - **Duration** — read-only text `<p>{installmentData.installmentDuration} months</p>`.
   - **Installment start date** — Popover + `Calendar`, same as the existing drawer's `installmentStartDate` field. No `disabled` prop on Calendar (future dates are allowed).
   - **Expense type** — `Select`, same as existing drawer.
   - **Subcategory (optional)** — `Select`, conditional on the selected expense type having subcategories.
6. Footer:
   - Primary button: **Update installment** (`isUpdating` → spinner + "Updating installment").
   - `DrawerClose` variant outline: **Cancel**.
   - `Separator`.
   - Destructive outline button: **Delete installment** → opens `DeleteDialog`.
7. `DeleteDialog`:
   - `title`: `"Delete installment"`.
   - `description`: `"This will permanently delete this installment and all {paidCount} payment records. This cannot be undone."` where `paidCount = installmentDuration - remainingInstallments`.
   - `onConfirm`: call `deleteInstallment(installmentId)`, close drawer, show success toast.

**Validation schema:**

New file `src/lib/validations/installments.ts`:

```ts
export const updateInstallmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  installmentStartDate: z.date(),
  expenseTypeId: z.string().min(1, "Expense type is required"),
  expenseSubcategoryId: z.string().optional(),
});
```

**Submit handler:** Build payload matching the server schema (convert Date → ISO string via `formatDateForAPI`; map `"none"` subcategory → `null`). Call `updateInstallment(payload)`. On success toast + close drawer.

---

### 4.4 Component: `src/components/installments/InstallmentTable.tsx` (desktop)

**Props:**

```ts
interface InstallmentTableProps {
  installments: Installment[];
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}
```

**Columns:**

| # | Header | Content | Notes |
|---|---|---|---|
| 1 | Name | `row.name` | bold, single line w/ truncate (`max-w-[200px]`) |
| 2 | Total | `₱{row.amount}` | right-aligned, formatted `en-PH` 2-decimal |
| 3 | Monthly | `₱{row.monthlyAmount}` | right-aligned, formatted |
| 4 | Progress | `{paid} / {duration}` + thin progress bar | 2-line stacked cell: top line text, bottom line a `h-1 rounded bg-muted` with `bg-primary` filled to `paid/duration` percentage |
| 5 | Start date | `format(row.installmentStartDate, "MMM d, yyyy")` | |
| 6 | Next payment | See rule below | |
| 7 | Status | `Badge` — `ACTIVE` (variant `secondary`) or `COMPLETED` (variant `outline`, muted) | |
| 8 | Actions | pencil `IconEdit` + trash `Trash2` | ghost icon buttons |

**Next payment rule:**

```
nextPaymentDate =
  row.lastProcessedDate
    ? addDays(new Date(row.lastProcessedDate), 30)
    : new Date(row.installmentStartDate)
```

If `row.installmentStatus === "COMPLETED"` → render `"—"` instead.

**Empty state (within table):** If `installments.length === 0`, render the `EmptyState` block instead (handled by parent, so the table can assume a non-empty array).

**Sorting:** None for v1 (default order from API).

**Search:** None for v1. The list is expected to be short (usually <20 active installments).

**Table primitives:** Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table` for consistency with the existing `ExpenseTable` markup (it uses TanStack Table under the hood — we can skip TanStack Table here since this is a simple read-only list; plain mapping is fine).

---

### 4.5 Component: `src/components/installments/InstallmentCard.tsx` (mobile)

**Props:**

```ts
interface InstallmentCardProps {
  installment: Installment;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}
```

**Layout (money-map-card, no accordion):**

```
┌──────────────────────────────────────────┐
│  [icon] Name                   [ACTIVE]  │
│  Expense type > Subcategory              │
│                                          │
│  Monthly        ₱ 1,234.56               │
│  Duration       6 months                 │
│  Progress       2 of 6   [▓▓░░░░]        │
│  Next payment   May 15, 2026             │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │                        [✎]    [🗑]   │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- Use existing `money-map-card-interactive` class. Click anywhere except action buttons triggers `onEdit`.
- Icon: reuse `Icons.addExpense` with `text-primary` like the existing `ExpenseCard`.
- Status badge: `ACTIVE` → `Badge variant="secondary"`, `COMPLETED` → `Badge variant="outline"`.
- Info is a `grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm` with label on left, value on right.
- Progress row shows `{paid} of {duration}` text and a 1px-ish thin `<div className="h-1 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${percent}%` }} /></div>`.
- Icon buttons (pencil + trash) live in a flex row at the bottom, aligned right. `onClick` handlers must `e.stopPropagation()` so they don't trigger the card's edit.

---

## 5. Responsive Behavior

Same split as the existing Expenses page:

- `md:hidden` → card list.
- `hidden md:block` → table.

The Tabs component itself is always visible (both breakpoints).

---

## 6. States (all components)

| State | Desktop | Mobile |
|---|---|---|
| Loading | `SkeletonTable tableType="expense"` | 4× `SkeletonExpenseCard` |
| Error (fetch failed) | inline error block with "Try again" button (match Expenses page error) | same |
| Empty (active, no data) | `EmptyState` with `CalendarClock` icon | same |
| Empty (after toggle shows only completed? not possible since ALL includes ACTIVE) | n/a | n/a |
| Populated | table rows | cards |

The Edit drawer's skeleton is already `SkeletonEditExpenseDrawerForm` — reuse.

---

## 7. Accessibility

- Tabs inherit full keyboard support from Radix.
- Icon-only action buttons require `aria-label`:
  - Edit: `aria-label="Edit installment"`
  - Delete: `aria-label="Delete installment"`
- Progress bar: add `role="progressbar"`, `aria-valuenow={paid}`, `aria-valuemin={0}`, `aria-valuemax={duration}`, `aria-label="{paid} of {duration} payments made"`.
- Status badge: include screen-reader text if badge color alone conveys status (use the text label directly).

---

## 8. Verification / Test Plan

Each task's `<verify>` block in `-plan.xml` gives the concrete commands. Summary:

### 8.1 API tests (Vitest)

- `src/app/api/installments/route.test.ts` — new file, covers:
  - 401 when unauthenticated
  - 400 for invalid `status` param
  - Returns only ACTIVE when `status` omitted
  - Returns ACTIVE+COMPLETED when `status=ALL`, never CANCELLED
  - Filters by `userId` and `isInstallment: true`
- `src/app/api/installments/[id]/route.test.ts` — new file, covers:
  - PATCH 401 unauthenticated
  - PATCH 404 when not found
  - PATCH 400 when target is not an installment
  - PATCH 400 when a locked field (`installmentDuration`, `accountId`, `tagIds`) is present
  - PATCH correctly recomputes `monthlyAmount` when `amount` changes
  - PATCH moved-forward start date: deletes children before the new date and reverses their balances, resets `remainingInstallments` to `installmentDuration`, nulls `lastProcessedDate`
  - PATCH moved-backward start date: only updates `installmentStartDate` and `date`
  - PATCH calls `onExpenseTransactionChange`
  - DELETE 401 unauthenticated
  - DELETE 404 when not found
  - DELETE 400 when target is not an installment
  - DELETE reverses balance for every child and deletes parent + children
  - DELETE calls `onExpenseTransactionChange`
- `src/app/api/expense-transactions/[id]/route.test.ts` — **modify existing test**:
  - Delete the existing `'does not hard-delete installment expense — marks as CANCELLED instead'` test.
  - Add a new test: `'rejects parent installment delete with 400'` — asserts status 400, the right error message, and that `db.$transaction` is not called.

### 8.2 Hook tests

- `src/hooks/useInstallmentsQuery.test.ts` — new file, covers:
  - `useInstallmentsQuery` fetches with default status
  - `useInstallmentsQuery({ status: 'ALL' })` passes `?status=ALL`
  - `updateInstallment` PATCH success invalidates the right keys
  - `deleteInstallment` error shows toast
  - `useInstallmentQuery(id)` fetches single row

### 8.3 Component tests

- `src/components/installments/EditInstallmentDrawer.test.tsx` — renders skeleton while fetching, renders form when data arrives, submit calls `updateInstallment`, delete flow calls `deleteInstallment`, account and duration are rendered as read-only text.
- `src/components/installments/InstallmentTable.test.tsx` — renders all columns correctly, computes `paid` and `nextPaymentDate` properly, fires `onEdit` and `onDelete`.
- `src/components/installments/InstallmentCard.test.tsx` — mobile card renders all info, action buttons `stopPropagation`, click on card calls `onEdit`.

### 8.4 Manual verification

- Navigate to `/expenses`, confirm the Tabs (Transactions | Installments) appear.
- Transactions tab looks and behaves identically to before.
- Installments tab shows all active parent installments (no child payments).
- Toggle "Show completed" — COMPLETED ones appear.
- CANCELLED ones never appear.
- Edit an installment: change the name and amount, save. Monthly recalculates. The Transactions tab reflects the new `monthlyAmount` on the next cron-created child (can't be tested manually in-session; note in verification doc).
- Edit an installment and move the start date forward past the last child: children should disappear from Transactions tab, account balance should reflect reversal, `remainingInstallments` should reset.
- Delete an installment: all children disappear from Transactions tab, account balance is restored.

---

## 9. Risks & Edge Cases

- **Concurrent cron run during edit:** If the installments cron runs while a PATCH moves the start date forward, we could race. Acceptable — the cron runs daily, the user can retry. No lock needed for v1.
- **Decimal precision:** Use `Number()` or `parseFloat()` on Prisma Decimal fields when incrementing balance (existing routes do the same). Document this with the conversion pattern `parseFloat(child.amount.toString())` to match prior code.
- **Empty children list when moving start date forward:** If there are no children yet, the filter yields an empty array — no child operations, just update the parent. This is fine.
- **Status filter on a completed-but-moved-backward installment:** A COMPLETED installment with `remainingInstallments = 0` that gets its start date edited backward — out of scope; spec disallows editing completed installments in the UI by simply not surfacing the Edit button. (Server still allows it if called directly.) Document this limitation.

**Server-side guard on COMPLETED:** For safety, the PATCH and DELETE routes should additionally allow operating on COMPLETED installments (user can clean up history), so do **not** add a `status === COMPLETED → 403` block. The only server gate is `CANCELLED → 404`.

---

## 10. Handoff Note (for the Builder)

> **Builder, read this before you start.**
>
> - No database migration is required. Do not run any Prisma migration commands.
> - There are **10 atomic tasks** in the plan. Commit once per task, with a descriptive conventional-commit message.
> - Task 4 (updating the existing expense-transactions DELETE to reject parent installments) **breaks** one existing test. You must update that test in Task 10. Do not run the full test suite between tasks 4 and 10 — expect that one test to fail. Run the targeted tests listed in each `<verify>` block instead.
> - The QA pipeline post-execution should handle creating new unit tests for the new files. If the generated tests do not cover the matrix in §8 above, ask the QA agent to extend them.
> - When in doubt about UI polish (badge variants, spacing, icon sizes), mirror `ExpenseCard` and `ExpenseTable` exactly.
> - After all tasks pass lint + build and the test matrix in §8 is green, write `docs/installment-management-verification.md`.

---

## 11. Definition of Done

- [ ] All 10 tasks committed atomically.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] All new and modified tests pass.
- [ ] Manual verification checklist (§8.4) complete.
- [ ] `docs/installment-management-verification.md` written.
