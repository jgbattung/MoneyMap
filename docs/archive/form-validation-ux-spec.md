# Form Validation UX Improvement -- Specification

## Objective

Eliminate the "silent submit failure" UX bug where forms fail validation on submit but display no visual feedback to the user. After this work, every form in the app will:

1. Show inline error messages below the offending field.
2. Highlight the errored field with a red border (already wired via `aria-invalid` in the Shadcn primitives -- just needs `<FormMessage />` to trigger the error state rendering).
3. Auto-scroll to the first errored field inside `ScrollArea` containers.
4. Validate on blur after the first submit attempt (`mode: "onTouched"`), so errors clear as the user fixes them.
5. Provide a subtle shake animation on the submit button when validation fails.

## Scope

### In Scope

- Add `<FormMessage />` to every `<FormItem>` in all affected form files (see full list below).
- Fix the `createExpenseTransactionSchema` refinement to produce separate, correctly-targeted error messages for the `date` path and the `installmentDuration`/`installmentStartDate` paths.
- Switch all `useForm()` calls from the default `mode: "onSubmit"` to `mode: "onTouched"` across all 26 form files.
- Add a reusable shake animation CSS keyframe and a `useShakeOnError` hook (or equivalent pattern) for submit buttons.
- Verify and fix scroll-to-error behavior inside Radix `ScrollArea` containers.

### Out of Scope

- `SetTargetDialog.tsx` -- uses raw `useState`, not React Hook Form. Different pattern, different task.
- Server-side validation changes.
- Changes to the Shadcn/ui primitives themselves (they already have `aria-invalid` styling).

## Current State Analysis

### Infrastructure That Already Works

| Component | Existing Behavior |
|---|---|
| `FormControl` (`src/components/ui/form.tsx`) | Sets `aria-invalid={!!error}` automatically when the field has an error. |
| `Input` (`src/components/ui/input.tsx`) | Has `aria-invalid:border-destructive` and ring styling in its class string. |
| `SelectTrigger` (`src/components/ui/select.tsx`) | Has `aria-invalid:border-destructive` and ring styling. |
| `Textarea` (`src/components/ui/textarea.tsx`) | Has `aria-invalid:border-destructive` and ring styling. |
| `FormLabel` (`src/components/ui/form.tsx`) | Turns red via `data-[error=true]:text-destructive`. |
| `FormMessage` (`src/components/ui/form.tsx`) | Renders error text in `text-destructive text-sm`. Already exists, just not imported/used in most forms. |

### The Root Problem

`<FormMessage />` is missing from the majority of form files. Without it, error text never renders. The `FormControl` still sets `aria-invalid` (so borders would turn red), but without visible error text the user has no explanation of what went wrong.

### Affected Files -- Complete Inventory

**Forms completely missing `<FormMessage />`** (17 files):

| File | FormItem Count | Notes |
|---|---|---|
| `src/components/forms/CreateExpenseTransactionSheet.tsx` | 10 | Includes installment fields |
| `src/components/forms/CreateExpenseTransactionDrawer.tsx` | 10 | Includes installment fields |
| `src/components/forms/CreateIncomeTransactionSheet.tsx` | 7 | |
| `src/components/forms/CreateIncomeTransactionDrawer.tsx` | 7 | |
| `src/components/forms/CreateTransferSheet.tsx` | 8 | |
| `src/components/forms/CreateTransferDrawer.tsx` | 9 | Uses ScrollArea |
| `src/components/forms/CreateExpenseTypeSheet.tsx` | 2 | |
| `src/components/forms/CreateExpenseTypeDrawer.tsx` | 2 | |
| `src/components/forms/CreateIncomeTypeSheet.tsx` | 2 | |
| `src/components/forms/CreateIncomeTypeDrawer.tsx` | 2 | |
| `src/components/forms/EditExpenseTypeSheet.tsx` | 2 | |
| `src/components/forms/EditExpenseTypeDrawer.tsx` | 2 | |
| `src/components/forms/EditIncomeTypeSheet.tsx` | 2 | |
| `src/components/forms/EditIncomeTypeDrawer.tsx` | 2 | |
| `src/components/forms/EditCardSheet.tsx` | 5 | |
| `src/components/forms/EditExpenseDrawer.tsx` | 10 | Uses ScrollArea, includes installment fields |
| `src/components/forms/EditTransferDrawer.tsx` | 9 | Uses ScrollArea |

**Forms with partial `<FormMessage />` coverage** (need gap-filling):

| File | FormItem Count | FormMessage Count | Gap |
|---|---|---|---|
| `src/components/forms/EditIncomeDrawer.tsx` | 7 | 1 | 6 missing |
| `src/components/forms/CreateCardDrawer.tsx` | 5 | 3 | 2 missing |

**Forms already fully covered** (no changes needed for `<FormMessage />`):

| File | FormItem Count | FormMessage Count |
|---|---|---|
| `src/components/forms/CreateAccountSheet.tsx` | 4 | 3 (checkbox excluded) |
| `src/components/forms/CreateAccountDrawer.tsx` | 4 | 3 (checkbox excluded) |
| `src/components/forms/CreateCardSheet.tsx` | 5 | 5 |
| `src/components/forms/EditAccountSheet.tsx` | 4 | 3 (checkbox excluded) |
| `src/components/forms/EditAccountDrawer.tsx` | 4 | 3 (checkbox excluded) |
| `src/components/forms/EditCardDrawer.tsx` | 5 | 5 |

**Note on checkbox fields:** The account forms have a boolean checkbox (`includeInNetWorth`) that does not need `<FormMessage />` because it is always valid (it is a toggle, not a required text field). The Builder should skip adding `<FormMessage />` to checkbox-only `<FormItem>` blocks.

Similarly, optional fields like `description`, `tags`, and `subcategory` technically do not require `<FormMessage />` because they have no required validation. However, they should still get `<FormMessage />` for consistency and future-proofing (if validation is added later, the message will "just work").

### Total `useForm()` calls that need `mode: "onTouched"` (26 files)

All 26 form files in `src/components/forms/` that use `useForm()`. Every single one currently uses the default `mode: "onSubmit"` (none explicitly set a mode). The change is identical in each file: add `mode: "onTouched"` to the `useForm()` options object.

## Implementation Details

### 1. Schema Fix: `createExpenseTransactionSchema`

**File:** `src/lib/validations/expense-transactions.ts`

The current `.refine()` has a single check that handles two distinct cases (installment missing fields AND non-installment missing date) with one error message targeted at `["installmentDuration"]`. This means:
- When a non-installment expense is submitted without a date, the error appears on the `installmentDuration` field (which is hidden) instead of the `date` field.
- The error message "Duration and start date are required for installment expenses" is misleading for the non-installment case.

**Fix:** Replace `.refine()` with `.superRefine()` to emit separate errors:

```typescript
export const createExpenseTransactionSchema = ExpenseTransactionValidation.superRefine(
  (data, ctx) => {
    if (data.isInstallment) {
      if (!data.installmentDuration || data.installmentDuration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duration is required for installment expenses",
          path: ["installmentDuration"],
        });
      }
      if (!data.installmentStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date is required for installment expenses",
          path: ["installmentStartDate"],
        });
      }
    } else {
      if (data.date === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date is required",
          path: ["date"],
        });
      }
    }
  }
);
```

This produces correctly-targeted inline errors for each field path.

**Important:** The `ExpenseTransactionInput` and `UpdateExpenseTransactionInput` type aliases at the bottom of the file must remain unchanged. Verify that `z.infer<typeof createExpenseTransactionSchema>` still resolves correctly after the `.refine()` to `.superRefine()` change (it should -- both return the same inferred type).

### 2. Adding `<FormMessage />` to Form Files

For each affected `<FormItem>`, add `<FormMessage />` as the last child inside `</FormItem>`, after `</FormControl>`. The pattern is:

```tsx
<FormItem className="p-4">
  <FormLabel>Field name</FormLabel>
  <FormControl>
    {/* input/select/etc */}
  </FormControl>
  <FormMessage />      {/* <-- ADD THIS LINE */}
</FormItem>
```

For fields wrapped in `<Select>` or `<Popover>` (where `<FormControl>` is nested deeper), `<FormMessage />` goes after the closing `</Select>` or `</Popover>`, still inside `<FormItem>`:

```tsx
<FormItem className="p-4">
  <FormLabel>Account</FormLabel>
  <Select ...>
    <FormControl>
      <SelectTrigger>...</SelectTrigger>
    </FormControl>
    <SelectContent>...</SelectContent>
  </Select>
  <FormMessage />      {/* <-- AFTER </Select>, BEFORE </FormItem> */}
</FormItem>
```

The import line must also be updated. If the file imports from `../ui/form` or `../../ui/form`, add `FormMessage` to the import list:

```tsx
// Before:
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";

// After:
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
```

### 3. Switching to `mode: "onTouched"`

In every `useForm()` call, add `mode: "onTouched"` to the options:

```tsx
// Before:
const form = useForm<z.infer<typeof SomeSchema>>({
  resolver: zodResolver(SomeSchema),
  defaultValues: { ... },
});

// After:
const form = useForm<z.infer<typeof SomeSchema>>({
  resolver: zodResolver(SomeSchema),
  mode: "onTouched",
  defaultValues: { ... },
});
```

This makes React Hook Form:
- NOT validate on mount (no premature errors).
- Validate a field on blur AFTER the user has touched it.
- Re-validate on change after the first validation (so errors clear as the user types a fix).

### 4. Shake Animation on Submit Button

**Approach:** Create a reusable custom hook `useShakeOnError` that:
1. Returns a `ref` to attach to the submit button.
2. Returns a function `triggerShake()` that adds a CSS class, then removes it after the animation completes.
3. The hook listens to the form's `formState.submitCount` and `formState.isValid` to detect failed submissions.

**File:** `src/hooks/useShakeOnError.ts`

**CSS animation:** Add a `shake` keyframe to the Tailwind config or use a `@keyframes` block in `globals.css`:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
```

**Usage in forms:** The Builder should apply this consistently. The cleanest approach is to have the hook return a `className` that conditionally includes `animate-shake`, and spread it onto the submit `<Button>`. The hook should auto-clear the class after the animation ends (300ms timeout or `onAnimationEnd`).

**Alternative (simpler) approach:** Instead of a hook, use a `ref` + direct DOM manipulation in the `onSubmit` error callback. React Hook Form's `handleSubmit` accepts a second argument for the error handler:

```tsx
<form onSubmit={form.handleSubmit(onSubmit, () => {
  // Validation failed
  buttonRef.current?.classList.add('animate-shake');
  setTimeout(() => buttonRef.current?.classList.remove('animate-shake'), 300);
})}>
```

The Builder should choose whichever approach results in cleaner code given the existing patterns. If a reusable hook avoids repetition across 26 files, prefer the hook.

### 5. Scroll-to-Error Inside ScrollArea

React Hook Form's default `shouldFocusError: true` calls `.focus()` on the first errored field. However, inside a Radix `ScrollArea`, the native browser focus-scroll may not work because the scrollable container is a custom Radix viewport (`[data-radix-scroll-area-viewport]`), not the document body.

**Verification step:** The Builder should first test whether the default behavior works. If focusing a field inside `ScrollArea` does NOT scroll it into view, implement a fix:

**Fix approach:** Use React Hook Form's `handleSubmit` error callback to find the first errored field and call `scrollIntoView()`:

```tsx
const onError: SubmitErrorHandler<FormValues> = (errors) => {
  // Find the first error field name
  const firstErrorField = Object.keys(errors)[0];
  if (firstErrorField) {
    const element = document.querySelector(`[name="${firstErrorField}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// Usage:
<form onSubmit={form.handleSubmit(onSubmit, onError)}>
```

This can be combined with the shake animation logic in the same error handler. If a reusable utility is created, it should handle both scroll-to-error and shake.

**Note:** Some fields (Select, DatePicker) may not have a `name` attribute on the actual DOM element. In that case, the fallback is to query by the `FormItem`'s `id` attribute (which `FormControl` sets via `formItemId`). The Builder should verify which selector works.

## Verification Plan

For each phase, the Builder should verify:

1. **Schema fix:** Write or update the unit test for `createExpenseTransactionSchema` to confirm:
   - Non-installment submission without a date produces an error on path `["date"]` with message "Date is required".
   - Installment submission without duration produces an error on path `["installmentDuration"]`.
   - Installment submission without start date produces an error on path `["installmentStartDate"]`.
   - Valid submissions pass (both installment and non-installment).

2. **FormMessage addition:** `npm run build` passes (no type errors from missing imports). Visual spot-check: submit a form without filling required fields and confirm error messages appear below each field.

3. **Mode change:** Visual spot-check: fill a field, tab away, observe that no error appears (field was filled). Clear a required field, tab away, observe error appears on blur.

4. **Shake animation:** Visual spot-check: submit empty form, observe button shakes. Animation should last ~300ms and not interfere with the error message display.

5. **Scroll-to-error:** Open a long form (e.g., CreateExpenseTransactionDrawer), scroll to the bottom, fill only the bottom fields, submit. Verify the form scrolls to the first unfilled required field at the top.

6. **Lint and build:** `npm run lint` and `npm run build` must both pass with zero errors after all changes.

---

## Handoff Note for the Builder

This spec is ready for execution. Key points:

- **Do not modify** `src/components/ui/form.tsx` or any Shadcn primitives. The infrastructure is already correct.
- **Do not modify** `SetTargetDialog.tsx`. It is out of scope.
- The schema fix in `expense-transactions.ts` changes `.refine()` to `.superRefine()`. The type exports at the bottom of the file must remain unchanged. Verify the build passes.
- When adding `<FormMessage />`, be careful with the placement inside `<FormItem>` blocks that contain `<Select>`, `<Popover>`, or other wrapper components. The `<FormMessage />` goes after the wrapper's closing tag, before `</FormItem>`.
- The `mode: "onTouched"` change applies to ALL 26 form files, including those that already have `<FormMessage />`.
- For the shake animation, prefer a reusable hook if it reduces repetition. If the hook approach is too complex, a simple inline pattern using `handleSubmit`'s error callback is acceptable.
- For scroll-to-error, test the default `shouldFocusError` behavior first inside `ScrollArea`. Only implement the `scrollIntoView` fix if the default does not work.
- Refer to `docs/form-validation-ux-plan.xml` for the task-by-task execution plan.
