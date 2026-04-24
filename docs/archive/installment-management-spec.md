# Installment Management — QA Fix Pass Specification

> **Feature:** Post-QA fixes for the Installment Management feature.
> **Status:** Ready for Builder
> **Handoff protocol:** `.claude/conventions/handoff-protocol.md`
> **Scope:** This spec covers ONLY the five (5) fixes identified during QA review of the shipped Installment Management feature. It does not re-specify the original feature. For the original feature context, see `docs/archive/installment-management-spec.md`.

---

## 1. Context

The Installment Management feature (Installments tab on the Expenses page) has shipped. QA review uncovered **five (5) issues** that must be addressed before the feature can be considered production-ready:

1. `InstallmentTable` is a bare `<Table>` with none of the shell structure (wrapper, search, date filters, pagination, empty state, skeleton) that the rest of the app uses on every desktop table.
2. Desktop editing currently opens a `Drawer`. The rest of the app uses `Sheet` on desktop and `Drawer` on mobile. Desktop must get its own `EditInstallmentSheet`.
3. `InstallmentCard` (mobile) exposes explicit Edit and Delete buttons. The codebase pattern (`ExpenseCard`) is button-less: the whole card is clickable and the drawer owns delete.
4. Deleting an installment from `InstallmentsTabContent` does not show a success toast.
5. **Pre-existing bug** exposed by this feature: `DELETE /api/expense-transactions/[id]` skips the account balance reversal when the transaction is `isSystemGenerated: true`. Installment child payments are always `isSystemGenerated: true` but they *did* decrement the account balance when created, so skipping the reversal leaves a stale balance when a child is deleted individually.

All five fixes are behind a single branch and a single verification pass.

---

## 2. Objectives & Scope

### In scope

- Rewrite `InstallmentTable` to match `ExpenseTable`'s structural shell 1:1 (wrapper, search, date filter toggles, pagination, empty state, skeleton). Columns remain installment-specific.
- Create a new `EditInstallmentSheet` for desktop editing, modeled after `EditAccountSheet`.
- Keep `EditInstallmentDrawer` — it remains the mobile-only editor.
- Refactor `InstallmentCard` to match `ExpenseCard`: no buttons, whole card is a click target, `onClick` prop only.
- Add the missing `toast.success()` on installment delete in `InstallmentsTabContent`.
- Fix the `DELETE /api/expense-transactions/[id]` balance reversal so it runs for **all** non-transfer expense deletes regardless of `isSystemGenerated`.
- Wire `InstallmentsTabContent` to: desktop row edit → Sheet, mobile card click → Drawer. Delete lives inside the Sheet / Drawer; the tab-level `DeleteDialog` is removed.

### Out of scope

- Changes to the `DELETE /api/installments/[id]` handler (already iterates children and calls `increment` — correct).
- Changes to the installment creation flow, cron, or `GET`/`PATCH /api/installments/[id]`.
- Changes to the Transactions tab.
- Any migration or schema change (none required).
- Sorting / column reordering in the Installments table.
- URL-persisted tab state, page size, or filter state.

---

## 3. Reference Patterns

| Concern | Reference file | Notes |
|---|---|---|
| Full desktop table shell (wrapper + search + ToggleGroup + pagination + EmptyState) | `src/components/tables/expenses/ExpenseTable.tsx` | Source of truth for the structural shell. |
| Sheet-based desktop editor | `src/components/forms/EditAccountSheet.tsx` | Delete button at the bottom of the Sheet, separator above it, `DeleteDialog` portal below the Sheet. |
| Button-less mobile card with click-to-edit | `src/components/shared/ExpenseCard.tsx` | Root div has `onClick`, no Edit/Delete buttons. |
| Drawer-based mobile editor | `src/components/installments/EditInstallmentDrawer.tsx` | Existing — stays as-is for mobile (minor touch-ups only). |
| Delete confirmation dialog | `src/components/shared/DeleteDialog.tsx` | Reused. |
| Toast on delete pattern | `ExpenseTable.handleDeleteConfirm` | `toast.success("Expense transaction deleted successfully", { duration: 5000 })` then call the mutation. |

---

## 4. Fix 1 — `InstallmentTable` structural parity with `ExpenseTable`

**File:** `src/components/installments/InstallmentTable.tsx` (rewrite).

### 4.1 Shell requirements (must match `ExpenseTable` 1:1)

The JSX tree below must wrap the existing installment columns:

```tsx
<>
  <div className="space-y-4">
    {/* Top bar: filter on the left, search on the right */}
    <div className="flex items-center justify-between">
      <div>
        <ToggleGroup type="single" variant="outline" size="sm" ...>
          <ToggleGroupItem value="view-all"   className="...">View all</ToggleGroupItem>
          <ToggleGroupItem value="this-month" className="...">This month</ToggleGroupItem>
          <ToggleGroupItem value="this-year"  className="...">This year</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex items-start gap-2 justify-end">
        <div className="w-full max-w-xs">
          <InputGroup>
            <InputGroupInput placeholder="Search installments..." value={searchTerm} onChange={...} />
            <InputGroupAddon><SearchIcon /></InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-4">Name</TableHead>
            <TableHead className="p-4 text-right">Total</TableHead>
            <TableHead className="p-4 text-right">Monthly</TableHead>
            <TableHead className="p-4">Progress</TableHead>
            <TableHead className="p-4">Start date</TableHead>
            <TableHead className="p-4">Next payment</TableHead>
            <TableHead className="p-4">Status</TableHead>
            <TableHead className="p-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length ? pageRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4">...</TableCell>
              ...
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={8}>
                <EmptyState
                  icon={SearchX}
                  title="No installments found"
                  description="Try adjusting your search or filters."
                  variant="table"
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination — identical JSX to ExpenseTable */}
      <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {`Showing ${pageRows.length} out of ${filteredRows.length}`}
            {debouncedSearchTerm && <span className="text-primary-600"> (filtered)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">{/* prev / numbers / next */}</div>
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={...}>...</Select>
        </div>
      </div>
    </div>
  </div>
</>
```

### 4.2 Date filter options

The mobile page has 3 options: **View all**, **This month**, **This year**. The Installments table uses these same 3 options (NOT 4 like `ExpenseTable`). The filter field is `installmentStartDate`.

```ts
const DATE_FILTER_OPTIONS = {
  viewAll:   'view-all',
  thisMonth: 'this-month',
  thisYear:  'this-year',
} as const;

// Filter logic:
if (dateFilter === 'this-month') {
  const d = new Date(row.installmentStartDate);
  if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
} else if (dateFilter === 'this-year') {
  const d = new Date(row.installmentStartDate);
  if (d.getFullYear() !== now.getFullYear()) return false;
}
```

### 4.3 Search

Debounced 300ms (same pattern as `ExpenseTable`). Search matches, case-insensitively:

- `row.name`
- `row.expenseType?.name`
- `row.expenseSubcategory?.name`
- `row.account?.name`

### 4.4 Pagination

Use `useReactTable` with `getCoreRowModel`, `getPaginationRowModel`, `autoResetPageIndex: false`, initial `pageSize: 10`. `PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]`. Copy the `getPageNumbers()` helper and the empty-page-safety `useEffect` verbatim from `ExpenseTable`.

Alternatively, implement the same pagination shape manually (the data set is small and we don't need TanStack Table's editing machinery). **Preferred approach:** use TanStack Table for parity — less drift with `ExpenseTable` over time.

### 4.5 Columns

Keep the existing 8 columns from the current `InstallmentTable` (Name, Total, Monthly, Progress, Start date, Next payment, Status, Actions). Re-use the existing `formatCurrency`, `computeNextPayment`, and progress-bar JSX. **No inline editing.** The Actions column is a single pencil icon button that calls `onEdit(row.id)`. Delete is not on the row — it moves into the Sheet.

```tsx
// Actions cell
<div className="flex justify-end gap-1">
  <Button
    variant="ghost"
    size="icon"
    aria-label="Edit installment"
    onClick={() => onEdit(row.id)}
  >
    <IconEdit className="h-4 w-4" />
  </Button>
</div>
```

### 4.6 Props

```ts
interface InstallmentTableProps {
  installments: Installment[];
  onEdit: (id: string) => void; // row pencil button
}
```

The `onDelete` prop is **removed** — delete is no longer a row-level concern.

### 4.7 Empty state (within table)

- When `installments.length === 0` (no data at all) → **parent handles this** (`InstallmentsTabContent` renders the "No installments yet" page-level empty state). The table is not mounted in that case.
- When `filteredRows.length === 0` (filtered/searched to nothing) → render `EmptyState` with `icon={SearchX}`, title `"No installments found"`, description `"Try adjusting your search or filters."`, `variant="table"` inside a full-colspan `<TableCell>` (match `ExpenseTable`).

### 4.8 Skeleton / loading state

`InstallmentTable` itself does not render a skeleton — the parent (`InstallmentsTabContent`) renders `SkeletonTable tableType="expense"` while `isLoading`. This is unchanged from the current setup. `InstallmentTable` is only mounted once data is loaded.

---

## 5. Fix 2 — `EditInstallmentSheet` (new, desktop)

**New file:** `src/components/installments/EditInstallmentSheet.tsx`

Modeled exactly after `src/components/forms/EditAccountSheet.tsx`. Desktop-only (≥ `md`).

### 5.1 Props

```ts
interface EditInstallmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  installmentId: string;
}
```

### 5.2 Form fields

Same fields as the existing `EditInstallmentDrawer`. Validation schema reused from `src/lib/validations/installments.ts` (`updateInstallmentSchema`).

| Field | Type | Read-only? |
|---|---|---|
| `name` | `Input` (text) | editable |
| `amount` (total) | `Input type="number"` with `FormDescription` showing `Monthly: ₱{watchedAmount / installmentDuration}` live | editable |
| Account | plain read-only display (`{installmentData.account.name}` in a disabled-styled field) | read-only |
| Duration | plain read-only display (`{installmentData.installmentDuration} months`) | read-only |
| `installmentStartDate` | Popover + `Calendar` (no `disabled` prop — future dates allowed) | editable |
| `expenseTypeId` | `Select` populated from `useExpenseTypesQuery` | editable |
| `expenseSubcategoryId` | `Select` conditional on the selected expense type having subcategories; uses `"none"` sentinel for null | editable |

No tags field. Field layout copies the Sheet field spacing from `EditAccountSheet` (`FormItem className="p-4"`).

### 5.3 Footer & delete

Identical pattern to `EditAccountSheet`:

1. `SheetFooter` with the primary `Update installment` submit button (shows "Updating installment..." while `isUpdating`) and a `SheetClose` Cancel outline button.
2. `<Separator className="mt-2 mb-6" />` below the footer.
3. A full-width destructive outline button labeled `Delete installment` (styled with the error-color classes copied from `EditAccountSheet`'s delete button) that opens `DeleteDialog`.
4. `DeleteDialog` rendered as a sibling of `Sheet` inside the component's fragment:
   - `title`: `"Delete installment"`
   - `description`: `"This will permanently delete this installment and all {paidCount} payment records. This cannot be undone."` where `paidCount = installmentDuration - remainingInstallments`.
   - `onConfirm`: call `deleteInstallment(installmentId)`, close dialog, close Sheet, `toast.success("Installment deleted successfully", { duration: 5000 })`.

### 5.4 Data flow

- `useInstallmentQuery(installmentId, { enabled: open })` to fetch single row.
- `useInstallmentsQuery()` for `updateInstallment`, `deleteInstallment`, `isUpdating`, `isDeleting`.
- While `isFetching` → render `SkeletonEditAccountSheetForm` (reuse — field count is close enough; if visual drift is significant, a new `SkeletonEditInstallmentSheetForm` may be created, but prefer reuse for v1).
- On `error` → render the same error block `EditAccountSheet` renders (title "Unable to load installment", description from `error`, Try again / Close buttons).

### 5.5 Submit handler

```ts
const onSubmit = async (values) => {
  try {
    const payload = {
      id: installmentId,
      name: values.name,
      amount: values.amount,
      installmentStartDate: formatDateForAPI(values.installmentStartDate),
      expenseTypeId: values.expenseTypeId,
      expenseSubcategoryId: values.expenseSubcategoryId === 'none' ? null : values.expenseSubcategoryId,
    };
    await updateInstallment(payload);
    toast.success("Installment updated successfully", { duration: 5000 });
    form.reset();
    onOpenChange(false);
  } catch (error) {
    toast.error("Failed to update installment", {
      description: error instanceof Error ? error.message : "Please check your information and try again.",
      duration: 6000,
    });
  }
};
```

---

## 6. Fix 3 — `InstallmentCard` button removal

**File:** `src/components/installments/InstallmentCard.tsx` (edit in place).

### 6.1 Props (new shape)

```ts
interface InstallmentCardProps {
  installment: Installment;
  onClick?: () => void;
}
```

- Remove `onEdit` and `onDelete` from props.
- Add `onClick?: () => void`.

### 6.2 JSX changes

- The root `<div className="money-map-card-interactive ...">` already has `onClick`. Change it to call `onClick?.()` (the prop) instead of `onEdit(installment.id)`.
- Delete the entire bottom `<div className="flex justify-end gap-1 pt-2">` containing the Edit and Delete icon buttons.
- Remove the `Button`, `IconEdit`, and `Trash2` imports — they are no longer used.

No other visual changes. The card is now purely display + clickable, matching `ExpenseCard`.

---

## 7. Fix 4 — Success toast on delete in `InstallmentsTabContent`

**File:** `src/components/installments/InstallmentsTabContent.tsx`.

### 7.1 Tab-level delete removal

With Fixes 2 and 3, delete no longer originates from the tab body — it originates from `EditInstallmentSheet` (desktop) or `EditInstallmentDrawer` (mobile), both of which own their own `DeleteDialog`. Therefore:

- Remove `deleteDialogOpen`, `installmentToDelete`, `handleDeleteRequest`, `handleDeleteConfirm` state and handlers from `InstallmentsTabContent`.
- Remove the `<DeleteDialog />` element from the tab body.
- Remove the `deleteInstallment`, `isDeleting` destructures from `useInstallmentsQuery` here (the editor components pull these directly).

**Important:** The `toast.success("Installment deleted successfully", { duration: 5000 })` call moves **into the editor components** (Sheet and Drawer) — specifically inside `handleDeleteConfirm` right after `deleteInstallment(installmentId)` resolves / is called, matching the pattern in `ExpenseTable.handleDeleteConfirm` where `toast.success` is called before the mutation (the mutation is fire-and-forget).

### 7.2 Desktop Sheet wiring

Replace the current wiring where desktop opens `EditInstallmentDrawer` with branching:

```tsx
<div className="md:hidden space-y-4">
  {installments.map((installment) => (
    <InstallmentCard
      key={installment.id}
      installment={installment}
      onClick={() => handleEdit(installment.id)}
    />
  ))}
</div>
<div className="hidden md:block">
  <InstallmentTable
    installments={installments}
    onEdit={handleEdit}
  />
</div>

{/* Editors */}
<div className="md:hidden">
  <EditInstallmentDrawer
    open={editOpen}
    onOpenChange={setEditOpen}
    installmentId={selectedInstallmentId}
  />
</div>
<div className="hidden md:block">
  <EditInstallmentSheet
    open={editOpen}
    onOpenChange={setEditOpen}
    installmentId={selectedInstallmentId}
  />
</div>
```

- `handleEdit(id)` just does `setSelectedInstallmentId(id); setEditOpen(true);` — same as the current implementation (minus the rename from `editDrawerOpen` to `editOpen`).
- `InstallmentCard.onClick` now passes a `() => void` function (no id argument). `handleEdit(installment.id)` is invoked in the arrow closure.
- `InstallmentTable.onEdit(id)` still takes an id — the pencil button in the Actions column passes `row.id`.

### 7.3 Drawer update

`EditInstallmentDrawer` must also carry the `toast.success("Installment deleted successfully", { duration: 5000 })` call inside its own `handleDeleteConfirm`. Verify the existing implementation — if it already shows a success toast on delete, leave it; if not, add it.

---

## 8. Fix 5 — Balance reversal bug in `DELETE /api/expense-transactions/[id]`

**File:** `src/app/api/expense-transactions/[id]/route.ts`.

### 8.1 The bug

At ~line 362:

```ts
if (!existingExpense.isSystemGenerated) {
  const amountToReverse = parseFloat(existingExpense.amount.toString());
  operations.push(
    db.financialAccount.update({
      where: { id: existingExpense.accountId, userId: session.user.id },
      data: { currentBalance: { increment: amountToReverse } },
    })
  );
}
```

The guard `!existingExpense.isSystemGenerated` is incorrect. Installment child payments satisfy **both** of the following:

- `isSystemGenerated: true` (set by `POST /api/expense-transactions` during initial-day creation and by the installments cron).
- The creation of the child row **decremented** the account balance (see `src/app/api/expense-transactions/route.ts` lines 298–347 and the cron at `src/app/api/cron/process-installments/route.ts`).

Therefore, deleting a child must **increment** (reverse). The guard causes the balance reversal to be silently skipped. There is no offsetting code path that compensates — account balances drift whenever a child is deleted directly.

### 8.2 The fix

Remove the `isSystemGenerated` check. Always reverse.

```ts
// Regular expense or payment record: Hard delete
const operations: PrismaPromise<unknown>[] = [];

const amountToReverse = parseFloat(existingExpense.amount.toString());

operations.push(
  db.financialAccount.update({
    where: {
      id: existingExpense.accountId,
      userId: session.user.id,
    },
    data: {
      currentBalance: {
        increment: amountToReverse,
      },
    },
  })
);

// Delete the expense record
operations.push(
  db.expenseTransaction.delete({
    where: {
      id: id,
      userId: session.user.id,
    },
  })
);

await db.$transaction(operations);
```

### 8.3 Why this is safe

The only other creators of `ExpenseTransaction` rows in the codebase are:

1. `POST /api/expense-transactions` — always decrements either `parsedAmount` (regular) or `monthlyAmount` (installment initial payment). The parent-installment row itself is created with `isSystemGenerated: false` (default), so it doesn't reach this DELETE path for installments (the `isInstallment` early-return at ~line 349 hands those off to `/api/installments/[id]`).
2. `src/app/api/cron/process-installments/route.ts` — creates each child payment with `isSystemGenerated: true` **and** decrements the account balance in the same transaction. Reversal on delete is required.
3. (None other.)

Transfer-related rows: a search for `linkedTransfer`, `transferId`, `isTransferFee` in this route returns no matches. Transfer fees (if any exist in the codebase) do not flow through this DELETE handler — they are handled by the transfer-specific routes. No special-case guard is needed.

### 8.4 Test impact

The existing test `'deletes a non-installment expense and reverses balance'` (already uses `isSystemGenerated: false`) still passes. A new test must be added:

- `'deletes a system-generated child payment and reverses account balance'` — mocks `existingExpense` with `isSystemGenerated: true`, `isInstallment: false`, `parentInstallmentId: 'parent-123'`; asserts that the DELETE operation includes a `financialAccount.update` with `increment: <amount>`.

The existing test `'does not reverse balance for system-generated transactions'` (if it exists) must be **deleted or repurposed** — the behavior it asserts is the bug. Check lines ~240–260 in `src/app/api/expense-transactions/[id]/route.test.ts` for this case.

### 8.5 `DELETE /api/installments/[id]` — no change needed

Confirm (do not modify) that `src/app/api/installments/[id]/route.ts` DELETE iterates children and pushes `financialAccount.update({ ... increment: parseFloat(child.amount) })` for each. This path is correct and independent of the `isSystemGenerated` guard above (it never calls the expense-transactions route).

---

## 9. Responsive & UX

- `<md` (mobile): cards only, tap anywhere on card opens `EditInstallmentDrawer`, delete inside the Drawer footer.
- `≥md` (desktop): full `InstallmentTable` shell; row pencil button opens `EditInstallmentSheet`, delete inside the Sheet footer.
- The "Show completed" toggle at the top of the tab body is unchanged.
- Page-level `EmptyState` ("No installments yet") is unchanged — still rendered by `InstallmentsTabContent` when `installments.length === 0 && !isLoading`.

---

## 10. States

| State | Desktop | Mobile |
|---|---|---|
| Loading | `SkeletonTable tableType="expense"` (parent) | 4× `SkeletonExpenseCard` (parent) |
| Error (fetch failed) | Tab-level error block (unchanged) | Tab-level error block (unchanged) |
| Empty (no installments) | Page `EmptyState` (`CalendarClock`) from parent | same |
| Empty (filtered) | Table-level `EmptyState` (`SearchX`, "No installments found") inside the table shell | n/a (mobile has no search/filter) |
| Populated | `InstallmentTable` | `InstallmentCard` list |

---

## 11. Accessibility

- Row action button: `aria-label="Edit installment"` on the pencil `Button`.
- Card: whole card is a `div` with `role="button"` is **not** required — `ExpenseCard` uses a plain clickable `div` and relies on `cursor-pointer`; match that pattern. (Keyboard users can still tab into action buttons inside the editor components.)
- Search: `InputGroupInput` `placeholder="Search installments..."`.
- ToggleGroup: inherits Radix keyboard behavior; no extra work.

---

## 12. Verification / Test Plan

### 12.1 Test suite updates

**Modify `src/app/api/expense-transactions/[id]/route.test.ts`:**

- Find and delete (or rewrite) any test that asserts `isSystemGenerated: true` transactions are deleted **without** balance reversal. That behavior is the bug being fixed.
- Add a test: `'reverses account balance when deleting a system-generated child payment'`. Mock `existingExpense` with `{ isSystemGenerated: true, isInstallment: false, parentInstallmentId: 'p1', amount: '1000', accountId: 'a1' }`. Assert DELETE calls `db.financialAccount.update` with `{ increment: 1000 }`.
- Keep the existing `'reverses account balance when deleting a regular expense'` test.
- Keep the `'rejects parent installment delete with 400'` test.

**Modify `src/components/installments/InstallmentTable.test.tsx`:**

- Replace assertions that probed the old bare-`<Table>` markup (if any tests inspect the wrapper) with assertions on the new shell: search input present, ToggleGroup options present, pagination controls rendered.
- Add a test: `'filters rows by search term'`.
- Add a test: `'filters rows by This month toggle'`.
- Add a test: `'renders table-level empty state when filtered to zero rows'`.
- Assert the pencil button calls `onEdit(id)`. Confirm the trash / `onDelete` prop is gone (test should not reference it).

**Modify `src/components/installments/InstallmentCard.test.tsx`:**

- Delete assertions on Edit and Delete buttons.
- Add: `'calls onClick when the card is clicked'`.
- Remove `onEdit` / `onDelete` props from the mock setup.

**Modify `src/components/installments/EditInstallmentDrawer.test.tsx` (light touch):**

- If the existing tests assert that delete does NOT show a success toast, flip the assertion so it does.
- Otherwise no changes required.

**Create `src/components/installments/EditInstallmentSheet.test.tsx`:**

- Mirrors `EditInstallmentDrawer.test.tsx`: renders skeleton while fetching, renders form when data arrives, Account and Duration shown as read-only, submit calls `updateInstallment`, Delete button opens `DeleteDialog`, confirm calls `deleteInstallment` and shows success toast.

### 12.2 Automated verification commands

```
npm run lint
npm run build
npx vitest run
```

All must exit 0 / all green before a task is considered done.

### 12.3 Manual smoke test

1. Navigate to `/expenses`, click the Installments tab.
2. Desktop: confirm the table shell matches `ExpenseTable` (rounded border wrapper, search bar top-right, filter toggles top-left, pagination strip at bottom).
3. Type a query in the search — results filter in ~300ms.
4. Click "This month" — rows filter to installments whose `installmentStartDate` is in the current month. Click "View all" — all rows return.
5. Click the pencil on a row → a **Sheet** opens from the right (desktop Sheet, not a Drawer).
6. Edit the name, click Update — Sheet closes, success toast fires, row reflects the new name.
7. Open another row in the Sheet, click **Delete installment** → DeleteDialog → Confirm. Sheet closes, success toast fires, row is gone from the table, child payments are gone from the Transactions tab, and the source account balance reflects the reversal.
8. Resize to mobile: click a card → a **Drawer** opens from the bottom (no row-level buttons visible). Delete inside the Drawer works the same.
9. Regression: on the Transactions tab, find a child installment payment (grayed / installment badge), open its edit drawer, delete it. Account balance must now reverse (previously it did not — this validates Fix 5).

---

## 13. Risks & Edge Cases

- **Fix 5 side effect:** If a transfer fee ever flows through the expense-transactions DELETE route (currently it should not), removing the `isSystemGenerated` guard would now reverse its balance too. Grep confirms no transfer-related conditions exist in this route. If a transfer fee path is discovered during implementation, pause and re-evaluate — do not ship blind.
- **Pagination state on filter change:** When the user applies a filter and the resulting dataset has fewer pages than the current `pageIndex`, the `useEffect` clamp (copied from `ExpenseTable`) resets to the last valid page.
- **Sheet + Drawer both mounted:** Both editor components are mounted in the DOM at all breakpoints but hidden via `md:hidden` / `hidden md:block` wrappers. This matches how `CreateExpenseTransactionSheet` and `CreateExpenseTransactionDrawer` coexist on the Expenses page. Each component calls `useInstallmentQuery(id, { enabled: open })`, so only the visible one fetches.
- **Toast duplication:** Only the editor's `handleDeleteConfirm` fires the success toast. Do not add a parallel toast in `useInstallmentsQuery`'s mutation `onSuccess` — that would cause double-toasting.

---

## 14. Handoff Note (for the Builder)

> **Builder, read this before you start.**
>
> 1. **No migrations.** No Prisma schema changes.
> 2. **Five atomic tasks**, one commit each. Order matters: Fix 5 first (API, no UI impact, unblocks QA confidence), then Sheet creation, then the table rewrite (which wires to the Sheet), then the card cleanup, then the tab container cleanup.
> 3. Re-read `src/components/tables/expenses/ExpenseTable.tsx` and `src/components/forms/EditAccountSheet.tsx` before touching any installment file. The structural shell must be a near-1:1 mirror.
> 4. Do **not** keep a `trash` icon anywhere in `InstallmentTable` or `InstallmentCard`. Delete moves entirely into the editors.
> 5. After all five tasks pass lint + build + vitest, update `docs/installment-management-verification.md` (append a new section for this fix pass — do not delete the original verification).
> 6. Existing tests will require light edits (documented in §12.1). Run targeted test files per task; only run the full `npx vitest run` at the end of the last task.
> 7. If the tab-level `DeleteDialog` removal causes a test in `InstallmentsTabContent` (if such a test exists — check first) to fail, update the test to assert the editor-level dialog instead.

---

## 15. Definition of Done

- [ ] All five (5) tasks committed atomically on the current feature branch (`feature/installment-management`).
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npx vitest run` passes with zero failures.
- [ ] Manual smoke test (§12.3) complete — specifically, step 9 (child delete balance reversal) has been observed.
- [ ] `docs/installment-management-verification.md` updated with a new "QA Fix Pass" section documenting each fix and its verification.
