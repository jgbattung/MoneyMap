# Form Validation UX — Explained

> Generated from: docs/archive/form-validation-ux-spec.md, docs/archive/form-validation-ux-plan.xml, docs/archive/form-validation-ux-verification.md
> Branch: fix/form-validation-ux
> Date: 2026-03-21

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 13 |
| Files created | 4 (useShakeOnError.ts, 3 test files) |
| Files modified | 40 |
| Tests written | 4 test files, 901 total tests passing |
| Commits | 8 |

**In one sentence:** Every form in Money Map was fixed to display inline validation errors, shake the submit button on failure, scroll to the first broken field in long drawers, and clear errors as the user corrects them — eliminating a "silent submit failure" bug where the form would reject submission with no visible feedback.

---

## What Was Built

Before this work, submitting a form with invalid or missing fields appeared to do nothing. The submit handler would fire, React Hook Form would detect validation failures, and the submission would be blocked — but the user saw no error messages, no red borders, and no indication of what went wrong. This was a silent failure: the button pressed, nothing happened, and the form sat there. The core infrastructure to show errors already existed in the Shadcn/ui primitives (`aria-invalid` border styling, `FormLabel` turning red, `FormMessage` rendering error text), but `<FormMessage />` was simply never placed inside the `<FormItem>` blocks in most of the 25 form files.

This fix addressed the problem at four levels simultaneously. First, `<FormMessage />` was added to every `<FormItem>` across all 25 affected forms so that error text now appears below each field. Second, all `useForm()` calls were switched from the default `mode: "onSubmit"` to `mode: "onTouched"`, which means errors clear themselves as the user fixes each field rather than only clearing on the next full submit. Third, a `useShakeOnError` hook was created and wired to every submit button — on a failed submission, the button briefly shakes for 300ms, giving a clear physical cue that something is wrong. Fourth, the 10 drawer forms that use a Radix `ScrollArea` container received an explicit `onError` handler that queries the first field with `aria-invalid="true"` and scrolls it into view, because the browser's native focus-scroll does not work reliably inside a custom scroll container.

A schema bug was also fixed as part of this work. The `createExpenseTransactionSchema` had a single `.refine()` that conflated two entirely different validation scenarios (non-installment submission missing a date, and installment submission missing duration/start date) into one shared error message pointed at the wrong field. This was replaced with `.superRefine()` that emits each error on its correct path, so the red border and error text appear on exactly the field that is missing. After all testing, a post-plan refinement replaced the harsh `--destructive` color token on all UI primitives with a softer `--color-text-error` token so that validation errors are clear but not visually alarming.

---

## Deep Dive

### Data Layer

No schema changes were made. No Prisma migrations were required.

### API Layer

No API routes were created or modified.

### State and Data Fetching Layer

One new custom hook was created: `src/hooks/useShakeOnError.ts`.

The hook accepts a slice of React Hook Form's `formState` — specifically `submitCount` (a number that increments every time `handleSubmit` is called, whether or not it succeeds) and `isSubmitSuccessful` (a boolean that is only `true` when the submission passed validation and the async handler resolved). Inside the hook, a `useEffect` watches `submitCount`. Each time `submitCount` changes, it checks whether `isSubmitSuccessful` is `false`. If so, it sets `shakeClassName` to `"animate-shake"` and schedules a `setTimeout` to clear it after 300ms. The timeout ref is stored so that it can be cancelled on unmount, preventing the "state update on unmounted component" warning that would otherwise appear if a user navigates away mid-animation.

The reason `submitCount` is used rather than a success/error event is that React Hook Form does not expose a "submit failed" event directly. The `submitCount` counter increments on every attempt, so comparing it across renders reliably detects new attempts. Combined with `isSubmitSuccessful: false`, it identifies a failed attempt specifically — ignoring successful submits that should not trigger a shake.

### UI Layer

**`<FormMessage />` across 25 forms.** This was the highest-volume change. For each of the 25 forms in `src/components/forms/`, `FormMessage` was added to the import from `../ui/form` and `<FormMessage />` was placed as the last child inside every `<FormItem>`. The placement matters: for simple fields, it goes after `</FormControl>`. For fields wrapped in a `<Select>` or `<Popover>`, it goes after the wrapper's closing tag but still inside `</FormItem>`, because `FormControl` is nested inside those wrappers and the error state flows outward through context.

**`mode: "onTouched"` across all 26 forms.** Every `useForm()` call received `mode: "onTouched"` in its options. With the default `mode: "onSubmit"`, React Hook Form only validates when the form is submitted — so a user who fixes a field has no way of knowing it is now correct until they submit again. `mode: "onTouched"` changes this: once a field has been touched (blurred), React Hook Form re-validates it on every change, so the error disappears the moment the field becomes valid. Critically, it does NOT validate on mount — so a freshly opened form shows no errors before the user has interacted with anything.

**Scroll-to-error in drawers.** The 10 drawer forms that use a Radix `ScrollArea` all received an `onError: SubmitErrorHandler` callback passed as the second argument to `form.handleSubmit(onSubmit, onError)`. React Hook Form's `handleSubmit` accepts this second argument specifically for failed-validation handling. The handler queries the DOM for the first element matching `[aria-invalid="true"]` — which React Hook Form (via `FormControl`) sets on fields that have errors — then calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` followed by `focus({ preventScroll: true })`. Using `aria-invalid` as the selector is more robust than using `name` attributes, because not all inputs (Select triggers, date pickers) expose a `name` attribute on the actual DOM element.

**Error color token.** After manual testing, the `--destructive` Tailwind token (`oklch(0.577 0.245 27.325)`) was found to be too visually aggressive for inline form errors. All nine affected UI primitives were updated to use `--color-text-error` instead — a darker and more desaturated red in light mode (`oklch(0.500 0.180 27.3)`) and a soft coral in dark mode (`oklch(0.800 0.075 20.5)`). This was a post-plan refinement done after visual inspection.

### Validation Layer

`src/lib/validations/expense-transactions.ts` was updated to replace `.refine()` with `.superRefine()` on `createExpenseTransactionSchema`.

The original `.refine()` had a single condition that tried to handle both the "non-installment form missing a date" case and the "installment form missing duration or start date" case. The error was always pointed at `["installmentDuration"]`. This meant that when a standard (non-installment) expense was submitted without a date, the error appeared on a hidden field — visible nowhere to the user. The fix uses `.superRefine()`, which receives the full Zod context object (`ctx`) and allows calling `ctx.addIssue()` multiple times with different `path` arrays. The three cases are now:

1. Non-installment + missing `date` → error on `["date"]`.
2. Installment + missing or non-positive `installmentDuration` → error on `["installmentDuration"]`.
3. Installment + missing `installmentStartDate` → error on `["installmentStartDate"]`.

The exported TypeScript types (`ExpenseTransactionInput`, `UpdateExpenseTransactionInput`) are unchanged. `z.infer<>` resolves identically for both `.refine()` and `.superRefine()` — both return the same output type from the base schema.

---

## Data Flow

**User submits an expense transaction form with the date field empty.**

1. The user presses the "Save" submit `<Button>` in `CreateExpenseTransactionDrawer`.
2. The button's `onClick` propagates to the `<form>` element's `onSubmit`, which is wired to `form.handleSubmit(onSubmit, onError)`.
3. `handleSubmit` calls the Zod resolver with the current form values. The resolver runs `createExpenseTransactionSchema.parseAsync(values)`.
4. Inside `createExpenseTransactionSchema`, the `.superRefine()` callback runs. `data.isInstallment` is `false` and `data.date` is `undefined`, so `ctx.addIssue()` is called with `path: ["date"]` and message `"Date is required"`.
5. The Zod resolver returns an errors object to React Hook Form. `form.formState.isSubmitSuccessful` stays `false`; `form.formState.submitCount` increments by 1.
6. React Hook Form sets `aria-invalid="true"` on the `date` field's `<FormControl>` wrapper.
7. The `<Input>` component inside `<FormControl>` picks up the `aria-invalid` attribute via CSS (`aria-invalid:border-text-error`) and renders a red border.
8. The `<FormMessage />` inside the date `<FormItem>` reads the error from React Hook Form context and renders `<p>Date is required</p>` in `text-error text-sm` styling.
9. `useShakeOnError` (which is watching `form.formState.submitCount` in a `useEffect`) detects the increment and `isSubmitSuccessful: false`, sets `shakeClassName = "animate-shake"`, and schedules a 300ms timeout to clear it. The submit `<Button>` renders with `className={cn("...", "animate-shake")}`, triggering the `globals.css` keyframe.
10. The `onError` handler fires. It queries `document.querySelector('[aria-invalid="true"]')`, finds the date field's input element, and calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` followed by `focus({ preventScroll: true })`. The `ScrollArea` viewport scrolls to center the date field.
11. After 300ms, `useShakeOnError`'s timeout fires, sets `shakeClassName = ""`, and the shake class is removed from the button.
12. The user fills in the date. Because `mode: "onTouched"` is active and the field has now been touched, React Hook Form re-validates the `date` field on every `onChange` event. The moment a valid date is entered, the error message disappears and the red border clears — without requiring another submit.

---

## Files Changed

| File | Change Type | What Changed |
|------|------------|--------------|
| `src/lib/validations/expense-transactions.ts` | Modified | Replaced `.refine()` with `.superRefine()` for targeted per-field error paths |
| `src/app/globals.css` | Modified | Added `@keyframes shake` and `.animate-shake` utility class |
| `src/hooks/useShakeOnError.ts` | Created | New hook returning `shakeClassName` based on failed submit detection |
| `src/hooks/__tests__/useShakeOnError.test.ts` | Created | Unit tests for the hook (5 cases) |
| `src/hooks/__tests__/useShakeOnError-extended.test.ts` | Created | Extended QA tests for edge cases (6 cases) |
| `src/lib/validations/__tests__/expense-transactions.test.ts` | Created | Unit tests for schema fix (5 cases) |
| `src/lib/validations/__tests__/expense-transactions-extended.test.ts` | Created | Extended QA tests for schema edge cases (19 cases) |
| `src/components/forms/CreateExpenseTransactionSheet.tsx` | Modified | Added FormMessage to 10 FormItems, mode: onTouched, useShakeOnError |
| `src/components/forms/CreateExpenseTransactionDrawer.tsx` | Modified | Same as sheet + onError scroll handler |
| `src/components/forms/EditExpenseDrawer.tsx` | Modified | Added FormMessage to 10 FormItems, mode: onTouched, onError scroll, useShakeOnError |
| `src/components/forms/CreateIncomeTransactionSheet.tsx` | Modified | Added FormMessage to 7 FormItems, mode: onTouched, useShakeOnError |
| `src/components/forms/CreateIncomeTransactionDrawer.tsx` | Modified | Same as sheet + onError scroll handler |
| `src/components/forms/EditIncomeDrawer.tsx` | Modified | Gap-filled 6 missing FormMessages, mode: onTouched, onError scroll, useShakeOnError |
| `src/components/forms/CreateTransferSheet.tsx` | Modified | Added FormMessage to 8 FormItems, mode: onTouched, useShakeOnError |
| `src/components/forms/CreateTransferDrawer.tsx` | Modified | Same as sheet + onError scroll handler |
| `src/components/forms/EditTransferDrawer.tsx` | Modified | Added FormMessage to 9 FormItems, mode: onTouched, onError scroll, useShakeOnError |
| `src/components/forms/CreateExpenseTypeSheet.tsx` | Modified | Added FormMessage to 2 FormItems, mode: onTouched, useShakeOnError |
| `src/components/forms/CreateExpenseTypeDrawer.tsx` | Modified | Same changes |
| `src/components/forms/EditExpenseTypeSheet.tsx` | Modified | Same changes |
| `src/components/forms/EditExpenseTypeDrawer.tsx` | Modified | Same changes |
| `src/components/forms/CreateIncomeTypeSheet.tsx` | Modified | Same changes |
| `src/components/forms/CreateIncomeTypeDrawer.tsx` | Modified | Same changes |
| `src/components/forms/EditIncomeTypeSheet.tsx` | Modified | Same changes |
| `src/components/forms/EditIncomeTypeDrawer.tsx` | Modified | Same changes |
| `src/components/forms/EditCardSheet.tsx` | Modified | Added FormMessage to 5 FormItems, mode: onTouched, useShakeOnError |
| `src/components/forms/CreateCardDrawer.tsx` | Modified | Gap-filled 2 missing FormMessages, mode: onTouched, onError scroll, useShakeOnError |
| `src/components/forms/CreateAccountSheet.tsx` | Modified | Added mode: onTouched, useShakeOnError (FormMessages already present) |
| `src/components/forms/CreateAccountDrawer.tsx` | Modified | Same + onError scroll handler |
| `src/components/forms/CreateCardSheet.tsx` | Modified | Added mode: onTouched, useShakeOnError (FormMessages already present) |
| `src/components/forms/EditAccountSheet.tsx` | Modified | Added mode: onTouched, useShakeOnError |
| `src/components/forms/EditAccountDrawer.tsx` | Modified | Same + onError scroll handler |
| `src/components/forms/EditCardDrawer.tsx` | Modified | Added mode: onTouched, onError scroll, useShakeOnError |
| `src/components/ui/form.tsx` | Modified | Error color tokens updated from --destructive to --color-text-error |
| `src/components/ui/input.tsx` | Modified | aria-invalid border/ring updated to text-error token |
| `src/components/ui/textarea.tsx` | Modified | aria-invalid border/ring updated to text-error token |
| `src/components/ui/select.tsx` | Modified | aria-invalid border/ring on SelectTrigger updated |
| `src/components/ui/checkbox.tsx` | Modified | aria-invalid border/ring updated |
| `src/components/ui/input-group.tsx` | Modified | aria-invalid border/ring on group wrapper updated |
| `src/components/ui/button.tsx` | Modified | aria-invalid border/ring updated |
| `src/components/ui/toggle.tsx` | Modified | aria-invalid border/ring updated |
| `src/components/ui/badge.tsx` | Modified | aria-invalid border/ring updated |

---

## Tests Added

| Test File | What It Tests | Key Cases |
|-----------|--------------|-----------|
| `src/lib/validations/__tests__/expense-transactions.test.ts` | `createExpenseTransactionSchema` path targeting | Non-installment missing date errors on `["date"]`; installment missing duration errors on `["installmentDuration"]`; installment missing start date errors on `["installmentStartDate"]`; valid submissions pass |
| `src/lib/validations/__tests__/expense-transactions-extended.test.ts` | Schema edge cases and `updateExpenseTransactionSchema` | Both installment fields missing simultaneously; `installmentDuration: 0` boundary; optional fields do not block success; `tagIds` over-limit; base field validation; update schema with optional fields; update schema missing id |
| `src/hooks/__tests__/useShakeOnError.test.ts` | `useShakeOnError` core behavior | shakeClassName set on failed submit; cleared after 300ms; not triggered on successful submit; submitCount: 0 does not trigger |
| `src/hooks/__tests__/useShakeOnError-extended.test.ts` | `useShakeOnError` edge cases | Timeout cleanup on unmount; debounce on consecutive failures; successful submit after prior failure does not re-shake; high submitCount with isSubmitSuccessful: true; buttonRef type structure |

The test strategy separates happy paths and basic regression cases (in the `*.test.ts` files written by the Builder during implementation) from edge cases and boundary conditions (in the `*-extended.test.ts` files generated by the QA pipeline). The schema tests work entirely at the Zod layer — no React, no HTTP — by calling `.safeParse()` directly and inspecting `error.issues[].path`. The hook tests use `@testing-library/react`'s `renderHook` and `act` to drive React state transitions and `vi.useFakeTimers()` to control the 300ms timeout without real delays.

---

## Key Concepts Used

| Concept | What It Is | How It Was Used Here |
|---------|-----------|----------------------|
| `FormMessage` (React Hook Form + Shadcn) | A component that reads the current field's error from React Hook Form context and renders it as a `<p>` element | Was the missing piece in all 25 forms — simply placing `<FormMessage />` inside each `<FormItem>` activated the already-wired error display infrastructure |
| `aria-invalid` | An HTML accessibility attribute that marks an input as invalid | React Hook Form's `FormControl` sets `aria-invalid={!!error}` automatically; the Shadcn UI primitives use `aria-invalid:` Tailwind variants to apply red borders; the scroll-to-error handler uses `[aria-invalid="true"]` as its DOM query selector |
| `mode: "onTouched"` (React Hook Form) | A validation trigger mode that validates a field on blur once it has been touched, and re-validates on change thereafter | Replaced the default `mode: "onSubmit"` in all 26 forms so that errors self-clear as the user types corrections, without requiring another submit attempt |
| `handleSubmit(onSubmit, onError)` | React Hook Form's submit wrapper accepts a second argument called when validation fails | Used to add the scroll-to-error and shake-trigger behavior on validation failure without modifying the success path (`onSubmit`) |
| `superRefine` (Zod) | A refinement method that receives a context object and can call `ctx.addIssue()` multiple times with different paths and messages | Replaced `.refine()` in `createExpenseTransactionSchema` to emit separate, correctly-targeted errors for the date field vs. the installment fields |
| `submitCount` (React Hook Form formState) | A counter that increments on every call to `handleSubmit`, regardless of outcome | Used inside `useShakeOnError` as the reliable signal for "a submit attempt just happened" — combined with `isSubmitSuccessful: false` to distinguish failures |
| CSS `@keyframes` + Tailwind utility class | A CSS animation definition paired with a one-off utility class that applies it | The `shake` keyframe and `.animate-shake` class were added to `globals.css` so the animation is available globally without Tailwind config changes; the class is added/removed by `useShakeOnError` for a 300ms window |
| `scrollIntoView` with `preventScroll` focus | Native DOM APIs for scrolling an element into the viewport | Used in the `onError` handler: `scrollIntoView` moves the Radix ScrollArea viewport to show the field, then `focus({ preventScroll: true })` focuses the field without undoing the scroll position set by `scrollIntoView` |

---

## What To Look At Next

- `src/hooks/useShakeOnError.ts` — The complete implementation of the shake hook is short (36 lines) and is the best place to understand how `submitCount` + `isSubmitSuccessful` are combined to detect failures without a dedicated "submit failed" event.
- `src/components/forms/CreateExpenseTransactionDrawer.tsx` — The most complete example of all four changes applied together: FormMessage on every field, mode: onTouched, useShakeOnError on the submit button, and the onError scroll handler. Reading this one file shows the full pattern used across all drawer forms.
- `src/lib/validations/expense-transactions.ts` — Shows the before/after of `.refine()` to `.superRefine()` and is the canonical example of how to emit multiple targeted errors from a single cross-field validation in this codebase.
