# Decimal Input Fix — Spec

## Bug Summary

When typing a decimal point "." in any `CurrencyInput` field (drawers and sheets), the dot is deleted on the first keystroke. Typing "." a second time makes it persist.

## Root Cause

**File:** `src/components/ui/currency-input.tsx`, lines 47–49

```tsx
React.useEffect(() => {
  setDisplayValue(formatNumber(toNumber(value)))
}, [value])
```

### Sequence of events when user types "." after "100":

1. `handleChange` fires → `cleaned = "100."` → `formatForDisplay("100.")` correctly returns `"100."` → `setDisplayValue("100.")` + `onValueChange("100.")`
2. Parent (react-hook-form `field.onChange`) receives `"100."` → updates form state → `value` prop changes
3. `useEffect` fires because `value` changed to `"100."`
4. `toNumber("100.")` → `parseFloat("100.")` → `100` (trailing dot stripped by parseFloat)
5. `formatNumber(100)` → `"100"` (no dot)
6. `setDisplayValue("100")` — **dot erased**

### Why it works on the second try:

The parent state is already `"100."` from attempt 1. Calling `field.onChange("100.")` again is a no-op (same value). The `useEffect` doesn't fire because `value` didn't change. The local `displayValue` of `"100."` survives.

### Why `formatForDisplay` is not the problem:

`formatForDisplay` (line 18–26) correctly handles trailing dots via `if (rawStr.endsWith(".")) return parts[0] + "."`. The `handleChange` function works correctly. The problem is solely the `useEffect` overwriting the display value by round-tripping through `parseFloat`.

## Fix

Add a ref flag (`isInternalChange`) that tracks whether the latest `value` change was caused by the user typing (internal) vs. an external update (form reset, initial load, programmatic change).

- In `handleChange`: set `isInternalChange.current = true` before calling `onValueChange`
- In the `useEffect`: if `isInternalChange.current` is true, reset it and skip the effect. Otherwise, sync from the external value.

This preserves the existing behavior for external syncs (form reset clears the input, initial load populates it) while preventing the effect from clobbering the user's in-progress typing.

## Affected Components

All 23 consumers of `CurrencyInput` across drawers, sheets, tables, and dialogs benefit from this fix. No changes needed in consumers — the fix is entirely within `currency-input.tsx`.

## Changes

| File | Change |
|------|--------|
| `src/components/ui/currency-input.tsx` | Add `isInternalChange` ref; guard useEffect |
