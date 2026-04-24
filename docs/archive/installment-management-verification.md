# Installment Management — QA Fix Pass Verification

## Status
All 5 tasks completed and committed on `feature/installment-management`.

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Fix balance reversal in DELETE /api/expense-transactions/[id] | `aed8656` | ✓ Done |
| 2 | Create EditInstallmentSheet component | `bed46f2` | ✓ Done |
| 3 | Rewrite InstallmentTable with full ExpenseTable shell | `6e0b426` | ✓ Done |
| 4 | Strip action buttons from InstallmentCard and switch to onClick prop | `94c18a0` | ✓ Done |
| 5 | Wire Sheet + Drawer split in InstallmentsTabContent and remove tab-level delete | `a2b43c3` | ✓ Done |

## Verification Steps

### Fix 5 — Balance reversal bug (Task 1, commit `aed8656`)
- **File changed:** `src/app/api/expense-transactions/[id]/route.ts`
- **Change:** Removed `if (!existingExpense.isSystemGenerated)` guard — balance reversal now runs unconditionally for all transactions reaching the hard-delete path.
- **Test changed:** `src/app/api/expense-transactions/[id]/route.test.ts`
  - Deleted: `'skips financialAccount.update when expense is system-generated'` (encoded the bug)
  - Added: `'reverses account balance when deleting a system-generated child payment'`
- **Verification:** `npx vitest run src/app/api/expense-transactions/[id]/route.test.ts` → 18/18 passed

### Fix 2 — EditInstallmentSheet (Task 2, commit `bed46f2`)
- **New file:** `src/components/installments/EditInstallmentSheet.tsx`
- Mirrors `EditAccountSheet` structure: Sheet + SkeletonEditAccountSheetForm / error block / full form, SheetFooter, Separator, destructive delete button, DeleteDialog sibling.
- Fields: name, total amount (with live monthly display), read-only Account, read-only Duration, installmentStartDate calendar, expenseTypeId select, conditional expenseSubcategoryId select.
- `handleDeleteConfirm` fires `toast.success("Installment deleted successfully")` before calling `deleteInstallment`.
- **New test:** `src/components/installments/EditInstallmentSheet.test.tsx` — 25 tests covering loading/error/form states, disabled read-only inputs, update submit, delete flow + success toast.
- **Verification:** `npx vitest run src/components/installments/EditInstallmentSheet.test.tsx` → 25/25 passed. `npm run build` ✓

### Fix 1 — InstallmentTable shell (Task 3, commit `6e0b426`)
- **File rewritten:** `src/components/installments/InstallmentTable.tsx`
- Shell matches `ExpenseTable` 1:1: ToggleGroup (View all / This month / This year), debounced search InputGroup, `overflow-hidden rounded-md border` table wrapper, TanStack Table pagination strip.
- Props simplified to `{ installments, onEdit }` — `onDelete` removed entirely. No trash icon anywhere in the component.
- Date filter operates on `installmentStartDate`.
- Table-level empty state: `EmptyState` with `SearchX` icon inside full-colspan `TableCell`.
- **Test rewritten:** `src/components/installments/InstallmentTable.test.tsx` — 21 tests asserting shell presence, search filtering, ToggleGroup items, edit button calls `onEdit(id)`, no delete button.
- **Verification:** `npx vitest run src/components/installments/InstallmentTable.test.tsx` → 21/21 passed. `npm run lint && npm run build` ✓

### Fix 3 — InstallmentCard button removal (Task 4, commit `94c18a0`)
- **File changed:** `src/components/installments/InstallmentCard.tsx`
- Props: replaced `onEdit`/`onDelete` with `onClick?: () => void`.
- Root div `onClick` now calls `onClick?.()`.
- Deleted the entire bottom `<div>` with Edit and Delete `<Button>` elements.
- Removed `Button`, `IconEdit`, `Trash2` imports (no longer used).
- **Test rewritten:** `src/components/installments/InstallmentCard.test.tsx` — 18 tests. No assertions on Edit/Delete buttons. Added: `'calls onClick when the card root is clicked'`, `'does NOT render Edit or Delete buttons'`, `'does not throw when onClick is not provided'`.
- **Verification:** `npx vitest run src/components/installments/InstallmentCard.test.tsx` → 18/18 passed

### Fix 3 wiring + Fix 4 — InstallmentsTabContent rewire (Task 5, commit `a2b43c3`)
- **File changed:** `src/components/installments/InstallmentsTabContent.tsx`
- Removed: `deleteDialogOpen`, `installmentToDelete`, `handleDeleteRequest`, `handleDeleteConfirm`, `DeleteDialog` import, `deleteInstallment`/`isDeleting` from hook destructure.
- Renamed `editDrawerOpen` → `editOpen`.
- `InstallmentCard` now receives `onClick={() => handleEdit(installment.id)}`.
- `InstallmentTable` now receives only `onEdit={handleEdit}` (no `onDelete`).
- Editors split: `md:hidden` wraps `EditInstallmentDrawer`, `hidden md:block` wraps `EditInstallmentSheet`.
- `EditInstallmentDrawer.handleDeleteConfirm` already had `toast.success("Installment deleted successfully")` from prior implementation — confirmed present, no change needed.
- **Verification:** `npx vitest run` (full suite) → 84 files, 1448 tests, all passed. `npm run lint && npm run build` ✓

## Automated Verification Commands

```
npm run lint       → ✓ No ESLint warnings or errors
npm run build      → ✓ Build successful (all routes compiled)
npx vitest run     → ✓ 84 test files, 1448 tests, 0 failures
```

## Manual Smoke Test (§12.3)

Steps 1–9 should be verified manually before merging:

1. Navigate to `/expenses`, click Installments tab.
2. Desktop: confirm table shell has rounded border wrapper, search bar top-right, filter toggles top-left, pagination strip at bottom.
3. Type a query in the search — results filter in ~300ms.
4. Click "This month" — rows filter by `installmentStartDate`. Click "View all" — all rows return.
5. Click pencil on a row → **Sheet** opens from the right (not a Drawer).
6. Edit the name, click Update → Sheet closes, success toast fires, row reflects new name.
7. Open a row in the Sheet, click **Delete installment** → DeleteDialog → Confirm → Sheet closes, success toast, row gone from table.
8. Resize to mobile: tap a card → **Drawer** opens from bottom (no row-level buttons visible on card).
9. *(Critical Fix 5 validation)* On Transactions tab, find a child installment payment, open its edit drawer, delete it. Account balance must now reverse.

## Notes

- Fix 5 was applied before any UI work to unblock QA confidence on the API layer independently.
- Phases 3, 4, and 5 were implemented atomically in sequence — the tab container (Phase 5) was applied together with the table rewrite (Phase 3) because the build required consistent prop signatures across all three components simultaneously.
- No schema migrations were required for any of the 5 fixes.
- `EditInstallmentDrawer` was confirmed to already have the success toast on delete from a prior implementation pass — no modification was needed.
