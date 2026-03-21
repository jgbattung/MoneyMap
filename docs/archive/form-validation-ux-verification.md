# form-validation-ux — Verification

## Status
All tasks completed and committed. Branch: `fix/form-validation-ux`

## Tasks Executed

| # | Task Name | Commit | Status |
|---|-----------|--------|--------|
| 1 | Fix createExpenseTransactionSchema refinement | 0717aa2 | ✓ Done |
| 2 | Add FormMessage + onTouched to expense transaction forms | (prev session) | ✓ Done |
| 3 | Add FormMessage + onTouched to income transaction forms | (prev session) | ✓ Done |
| 4 | Add FormMessage + onTouched to transfer forms | (prev session) | ✓ Done |
| 5 | Add FormMessage + onTouched to expense type forms | (prev session) | ✓ Done |
| 6 | Add FormMessage + onTouched to income type forms | e1a0b46 | ✓ Done |
| 7 | Add FormMessage + onTouched to card and account forms | e1a0b46 | ✓ Done |
| 8 | Add shake keyframe animation to global CSS | 475cba3 | ✓ Done |
| 9 | Create useShakeOnError hook | 168dda2 | ✓ Done |
| 10 | Apply useShakeOnError to all form submit buttons | 4ea96de | ✓ Done |
| 11 | Verify and fix scroll-to-error inside ScrollArea | a1e6ba8 | ✓ Done |
| 12 | Full lint, build, and test pass | — | ✓ Done |
| 13 | Replace harsh destructive red with softer error token across all UI components | 18e5749 | ✓ Done |

## Verification Steps

### Phase 1 — Schema Fix
- Replaced `.refine()` with `.superRefine()` in `createExpenseTransactionSchema`
- Three separate `ctx.addIssue()` calls with correct `path` targeting for `date`, `installmentDuration`, `installmentStartDate`
- Unit tests: `src/lib/validations/__tests__/expense-transactions.test.ts` — **5/5 passed**

### Phase 2 — FormMessage + onTouched
- Added `FormMessage` import and `<FormMessage />` to every `<FormItem>` block in all 25 form files
- Added `mode: "onTouched"` to every `useForm()` call
- Files updated: all forms in `src/components/forms/` except `SetTargetDialog.tsx`
- Verified: `npm run build` — zero errors

### Phase 3 — Shake Animation
- Added `@keyframes shake` and `.animate-shake` to `src/app/globals.css`
- Created `src/hooks/useShakeOnError.ts` — watches `submitCount` and applies `animate-shake` for 300ms on failed submissions
- Unit tests: `src/hooks/__tests__/useShakeOnError.test.ts` — **5/5 passed**
- Applied `shakeClassName` to submit buttons in all 25 form components

### Phase 4 — Scroll-to-Error
- Added `onError` handler to `form.handleSubmit(onSubmit, onError)` in all 10 drawer forms using Radix `ScrollArea`
- Handler queries `[aria-invalid="true"]` and calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` + `focus({ preventScroll: true })`
- Forms updated: `CreateExpenseTransactionDrawer`, `CreateIncomeTransactionDrawer`, `CreateTransferDrawer`, `EditExpenseDrawer`, `EditIncomeDrawer`, `EditTransferDrawer`, `EditCardDrawer`, `CreateCardDrawer`, `CreateAccountDrawer`, `EditAccountDrawer`

### Phase 5 — Final QA
- `npm run lint` — ✓ No ESLint warnings or errors
- `npm run build` — ✓ Compiled successfully, 19 static pages generated
- `npx vitest run` — ✓ **57 test files, 876 tests, all passed**

## QA Results

**QA Pipeline run:** 2026-03-21

### Test Files Generated
| File | Tests | Status |
|------|-------|--------|
| `src/lib/validations/__tests__/expense-transactions-extended.test.ts` | 19 | PASS |
| `src/hooks/__tests__/useShakeOnError-extended.test.ts` | 6 | PASS |

### Coverage Added
**Schema (`createExpenseTransactionSchema`):**
- Both installment fields missing simultaneously — both errors reported
- `installmentDuration: 0` boundary (not positive)
- Optional fields (description, subcategory, tagIds) do not block success
- `tagIds` over 10-item limit fails correctly
- Base field validation: accountId empty, name >100 chars, amount invalid/non-numeric, expenseTypeId empty

**`updateExpenseTransactionSchema` (previously untested):**
- Passes with only `id` + one field
- Passes with `id` + all base fields
- Fails when `id` is missing
- Fails when `id` is empty string — correct error message
- Passes with only `id` (all other fields optional)
- Fails when `amount` is provided but invalid
- Passes with installment fields on update

**Hook (`useShakeOnError`):**
- Timeout cleanup on unmount (no state update after unmount)
- Multiple consecutive failed submits reset the 300ms window (debounce)
- `submitCount = 0` with `isSubmitSuccessful` change — no shake triggered
- Successful submit after prior failure — shake does not re-trigger
- `buttonRef` type structure check
- High `submitCount` with `isSubmitSuccessful: true` — no shake

### Vitest Results
- **Individual files:** 25 passed, 0 failed
- **Full suite:** 59 test files, 901 tests, 0 failures

### Fixes Applied
None — all tests passed on first run. No source code changes required.

### Final Status: PASS

---

### Post-Plan: Error Color Refinement (commit 18e5749)
After manual testing, the `--destructive` token (`oklch(0.577 0.245 27.325)`) was found to be too harsh for inline validation errors. All error/invalid states were updated to use the project's `--color-text-error` token instead:
- **Light mode:** `oklch(0.500 0.180 27.3)` — darker, desaturated red
- **Dark mode:** `oklch(0.800 0.075 20.5)` — soft coral

**Files updated:**
- `src/components/ui/form.tsx` — `FormLabel` error color + `FormMessage` text
- `src/components/ui/input.tsx` — `aria-invalid` border + ring
- `src/components/ui/textarea.tsx` — `aria-invalid` border + ring
- `src/components/ui/select.tsx` — `aria-invalid` border + ring on `SelectTrigger`
- `src/components/ui/checkbox.tsx` — `aria-invalid` border + ring
- `src/components/ui/input-group.tsx` — `aria-invalid` border + ring on group wrapper
- `src/components/ui/button.tsx` — `aria-invalid` border + ring
- `src/components/ui/toggle.tsx` — `aria-invalid` border + ring
- `src/components/ui/badge.tsx` — `aria-invalid` border + ring

## Notes
- The `onError` scroll-to-error fix targets `[aria-invalid="true"]` which React Hook Form sets on fields with errors. This works for `Input`, `SelectTrigger`, and `Textarea` components which all receive `aria-invalid` via the `FormControl` wrapper.
- The `animate-shake` class uses a 0.3s duration matching the hook's 300ms timeout cleanup.
- `SetTargetDialog.tsx` was intentionally excluded per the plan spec.
