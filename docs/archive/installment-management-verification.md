# Installment Management — Verification

## Status
All 10 tasks completed and committed. Lint: PASS. Build: PASS. Tests: 1356/1356 (80 test files).

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Add GET /api/installments route | a2f60ca | ✓ Done |
| 2 | Add PATCH /api/installments/[id] route | 36f0f03 | ✓ Done |
| 3 | Add DELETE /api/installments/[id] route | 36f0f03 (same file) | ✓ Done |
| 4 | Reject parent-installment delete on legacy route | 0f785e1 | ✓ Done |
| 5 | Add useInstallmentsQuery hook | 30613c9 | ✓ Done |
| 6 | Add EditInstallmentDrawer component | 778f32f | ✓ Done |
| 7 | Add InstallmentTable (desktop) | 885ab49 | ✓ Done |
| 8 | Add InstallmentCard (mobile) | 4ad1ad4 | ✓ Done |
| 9 | Wire Tabs + Installments tab into Expenses page | 4beb811 | ✓ Done |
| 10 | Update existing tests + add new test coverage | 9b0e3e1 | ✓ Done |

## Verification Steps

### Lint
```
npm run lint -- --quiet
✔ No ESLint warnings or errors
```

### Build
```
npm run build
✓ Compiled successfully
Linting and checking validity of types — PASS
```

### Tests
```
npx vitest run
Test Files  80 passed (80)
Tests       1356 passed (1356)
```

New test files added:
- `src/app/api/installments/route.test.ts` — 6 tests covering GET endpoint (auth, status param validation, filter logic)
- `src/app/api/installments/[id]/route.test.ts` — 15 tests covering PATCH (locked fields, amount recompute, start-date forward/backward) and DELETE (balance reversal, child deletion, recalculator call)
- `src/hooks/useInstallmentsQuery.test.ts` — 6 tests covering list fetch, status param, invalidation keys, error toast, and single-row fetch

Modified test file:
- `src/app/api/expense-transactions/[id]/route.test.ts` — Removed `'does not hard-delete installment expense — marks as CANCELLED instead'`, added `'rejects parent installment delete with 400'`

## Files Introduced

### API
- `src/app/api/installments/route.ts` — GET list (ACTIVE or ALL, never CANCELLED)
- `src/app/api/installments/[id]/route.ts` — GET single, PATCH (with start-date forward logic), DELETE (with child cleanup and balance reversal)

### Modified API
- `src/app/api/expense-transactions/[id]/route.ts` — DELETE now returns 400 for parent installments instead of soft-cancelling

### Client
- `src/hooks/useInstallmentsQuery.ts` — `useInstallmentsQuery` (list + mutations) and `useInstallmentQuery` (single row)
- `src/lib/validations/installments.ts` — `updateInstallmentSchema`
- `src/components/installments/EditInstallmentDrawer.tsx` — Drawer form for editing installments (read-only account/duration, editable name/amount/start-date/type/subcategory, delete confirmation)
- `src/components/installments/InstallmentTable.tsx` — Desktop table with progress bar, next-payment calculation, status badge, action buttons
- `src/components/installments/InstallmentCard.tsx` — Mobile card with same columns, stopPropagation on action buttons
- `src/components/installments/InstallmentsTabContent.tsx` — Container: show-completed toggle, loading/error/empty states, EditInstallmentDrawer and DeleteDialog wiring
- `src/app/expenses/page.tsx` — Wrapped in Tabs; existing content moved to `value="transactions"`, new `value="installments"` renders InstallmentsTabContent

## Notes

- Tasks 2 and 3 (PATCH and DELETE) are in the same file `[id]/route.ts` and share one commit — they were created together to avoid creating an incomplete partial file.
- The GET /api/installments/[id] single-row endpoint was added alongside PATCH/DELETE per the spec's decision note in Task 5 (hook needs a direct fetch rather than deriving from list cache).
- `monthlyAmount` recalculation on PATCH amount change: uses `newAmount / existing.installmentDuration`. Past child payments are not modified (historical record).
- Start-date moved forward: children with `date < newStart` are deleted, their balance reversals are pushed to the same `$transaction`. `remainingInstallments` resets to `installmentDuration`, `lastProcessedDate` is nulled.
- Start-date moved backward: only parent fields updated, no child operations. `date` field is set to `newStart`.
- `INSTALLMENT_STATUS` constant remains exported from the expense-transactions route — still imported by `route.ts` (list) and the cron.
- Component tests for `EditInstallmentDrawer`, `InstallmentTable`, `InstallmentCard` are not included in the unit test files committed here — the QA pipeline agent should generate those as part of its post-execution sweep.

## QA Results

**QA Pipeline run:** 2026-04-19
**Status:** PASS

### Test Files Generated

| File | Tests |
|------|-------|
| `src/components/installments/InstallmentTable.test.tsx` | 21 |
| `src/components/installments/InstallmentCard.test.tsx` | 22 |
| `src/components/installments/EditInstallmentDrawer.test.tsx` | 28 |

`src/hooks/useInstallmentsQuery.test.ts` — pre-existing, 6 tests (already passing, no changes made)

### Vitest Results

**Full suite after QA:** 83 test files, 1427 tests, 0 failures

### Fixes Applied

- `InstallmentTable.test.tsx` — Fixed `renders "—" when monthlyAmount is null` to account for `₱—` rendered as split text nodes; fixed `renders the formatted start date` to use a unique date (via `lastProcessedDate`) avoiding collision with next-payment cell; fixed `shows startDate as next payment when lastProcessedDate is null` to use `getAllByText` since both cells render the same date.
- `InstallmentCard.test.tsx` — Fixed `renders "—" for monthly when monthlyAmount is null` to use `container.textContent` to detect `₱—` split across text nodes.
- `EditInstallmentDrawer.test.tsx` — Added `/* eslint-disable react/display-name */` to suppress lint error from inline arrow component in FormField mock.

### Source Fixes

None — all issues were test code errors (Category A).

### Commit

`f8a6618` — test(installments): add component and hook tests for installment management feature

---

## Manual Verification Checklist (§8.4)

- [ ] Navigate to `/expenses` — Transactions and Installments tabs appear
- [ ] Transactions tab: existing behavior unchanged
- [ ] Installments tab: shows ACTIVE parent installments (no child payments appear)
- [ ] Toggle "Show completed" — COMPLETED installments appear alongside ACTIVE ones
- [ ] CANCELLED installments never appear in either toggle state
- [ ] Edit installment — change name and amount; Monthly amount live-updates in description; save succeeds
- [ ] Edit installment — move start date forward; children before new date disappear from Transactions tab; account balance is restored
- [ ] Delete installment — all children disappear from Transactions tab; account balance is restored
