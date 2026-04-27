# Currency Input Formatting - Spec

## Overview

Create a reusable `CurrencyInput` component that formats numeric values with comma separators as the user types (e.g., `5000` displays as `5,000`). Integrate it into all currency/monetary input fields across forms and inline table editing.

## Branch

`feature/currency-input-formatting`

## Acceptance Criteria

1. A `CurrencyInput` component exists at `src/components/ui/currency-input.tsx`.
2. The component accepts `value: number` and `onValueChange: (value: number) => void`.
3. Numbers display with comma formatting as the user types (5000 -> 5,000).
4. Cursor position is preserved after formatting (no jumping to end).
5. All currency form fields use the new component.
6. All 3 table inline editors use the new component for the `amount` column.
7. Lint passes, build passes, all existing tests pass.

## Current State

### Form Pattern (React Hook Form)

All currency fields follow this identical pattern with `type="number"`:

```tsx
<FormField
  control={form.control}
  name="amount"
  render={({ field }) => (
    <FormItem className="p-4">
      <FormLabel>Amount</FormLabel>
      <FormControl>
        <Input
          type="number"
          placeholder="0"
          className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
          {...field}
          disabled={isCreating}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Note: The spin-button-hiding CSS classes will no longer be needed since `CurrencyInput` uses `type="text"`.

### Table Inline Editing Pattern (CellContent)

All 3 table files (Income, Expense, Transfer) share the same `CellContent` component. Key details:

- State: `const [value, setValue] = useState("")` — stores value as string
- Sync: `useEffect(() => { setValue(initialValue ?? "") }, [initialValue])`
- Save: `onBlur` calls `tableMeta?.updateData(row.original.id, column.id, value)`
- Read mode for numbers: `amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Edit mode for numbers: Falls through to the generic `<Input>` at the bottom (no special number branch in edit mode)

```tsx
// Generic fallback at bottom of CellContent (handles all edit-mode fields without special cases)
return (
  <Input
    value={value}
    onChange={e => setValue(e.target.value)}
    onBlur={onBlur}
    className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
  />
);
```

### SetTargetDialog Pattern (no React Hook Form)

Uses plain `useState<string>` with controlled `<Input>`:
```tsx
<Input
  id="target-amount"
  type="number"
  placeholder="e.g., 1000000"
  value={targetAmount}
  onChange={(e) => setTargetAmount(e.target.value)}
  disabled={isUpdating}
  className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
/>
```

This file stores value as a string and calls `parseFloat(targetAmount)` on submit. Integration requires adjusting to use `value: number` / `onValueChange`.

## Complete File List

### Currency amount fields (apply CurrencyInput):

**Transaction forms:**
- `src/components/forms/CreateIncomeTransactionSheet.tsx` — `amount`
- `src/components/forms/CreateIncomeTransactionDrawer.tsx` — `amount`
- `src/components/forms/CreateExpenseTransactionSheet.tsx` — `amount`
- `src/components/forms/CreateExpenseTransactionDrawer.tsx` — `amount`
- `src/components/forms/CreateTransferSheet.tsx` — `amount`, `feeAmount`
- `src/components/forms/CreateTransferDrawer.tsx` — `amount`, `feeAmount`
- `src/components/forms/EditIncomeDrawer.tsx` — `amount`
- `src/components/forms/EditExpenseDrawer.tsx` — `amount`
- `src/components/forms/EditTransferDrawer.tsx` — `amount`, `feeAmount`

**Installment forms:**
- `src/components/installments/EditInstallmentSheet.tsx` — `amount`
- `src/components/installments/EditInstallmentDrawer.tsx` — `amount`

**Budget/type forms (spending limit / income goal fields):**
- `src/components/forms/CreateExpenseTypeSheet.tsx` — budget limit
- `src/components/forms/CreateExpenseTypeDrawer.tsx` — budget limit
- `src/components/forms/EditExpenseTypeSheet.tsx` — budget limit
- `src/components/forms/EditExpenseTypeDrawer.tsx` — budget limit
- `src/components/forms/CreateIncomeTypeSheet.tsx` — income goal
- `src/components/forms/CreateIncomeTypeDrawer.tsx` — income goal
- `src/components/forms/EditIncomeTypeSheet.tsx` — income goal
- `src/components/forms/EditIncomeTypeDrawer.tsx` — income goal

**Net worth target:**
- `src/components/forms/SetTargetDialog.tsx` — target amount (uses useState, not RHF)

**Table inline editing:**
- `src/components/tables/income/IncomeTable.tsx` — amount column in CellContent
- `src/components/tables/expenses/ExpenseTable.tsx` — amount column in CellContent
- `src/components/tables/transfers/TransferTable.tsx` — amount column in CellContent

### NOT in scope (integer counts, not currency):
- `installmentDuration` fields in CreateExpenseTransactionSheet/Drawer and EditExpenseDrawer — these are "months" counts
- `totalInstallments` in any installment form
- `EditableNumberCell.tsx` — unused, delete as cleanup

**Total: 23 files to modify + 1 new component + 1 deletion = 25 files**

## Technical Design

### CurrencyInput Component

**Location:** `src/components/ui/currency-input.tsx`

**Interface:**
```tsx
interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}
```

**Behavior:**
- Renders `<Input type="text" inputMode="decimal" />`
- Internal `displayValue` state holds the comma-formatted string
- On change: strips non-numeric chars (except `.`), prevents multiple decimals, parses to number, calls `onValueChange`, reformats display
- On mount / when `value` prop changes externally (e.g., form reset): syncs display via `useEffect`
- Empty field = value of `0`, display of `""`
- Uses `React.forwardRef` to match Shadcn Input pattern
- Cursor management: counts commas before/after formatting to adjust cursor position via `requestAnimationFrame`

### Form Integration (RHF pattern)

```tsx
// BEFORE
<Input
  type="number"
  placeholder="0"
  className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
  {...field}
  disabled={isCreating}
/>

// AFTER
<CurrencyInput
  placeholder="0"
  value={field.value}
  onValueChange={field.onChange}
  onBlur={field.onBlur}
  name={field.name}
  ref={field.ref}
  disabled={isCreating}
/>
```

### Table Integration (CellContent pattern)

Add a `columnMeta?.type === "number"` branch in edit mode, before the generic `<Input>` fallback. Use a `useRef<number>` to track the latest value for `onBlur`:

```tsx
// Add ref at top of CellContent:
const amountRef = useRef<number>(Number(initialValue) || 0);

// Add branch in edit mode, before the generic Input fallback:
if (columnMeta?.type === "number") {
  return (
    <CurrencyInput
      className="w-full"
      value={Number(value) || 0}
      autoFocus
      onValueChange={(num) => {
        amountRef.current = num;
        setValue(String(num));
      }}
      onBlur={() => {
        tableMeta?.updateData(row.original.id, column.id, String(amountRef.current));
      }}
    />
  );
}
```

### SetTargetDialog Integration

Since this uses `useState<string>` instead of RHF, change to `useState<number>`:

```tsx
// BEFORE
const [targetAmount, setTargetAmount] = useState<string>('');
// Initialize: setTargetAmount(currentTarget ? currentTarget.toString() : '');
// Submit: const amount = targetAmount ? parseFloat(targetAmount) : null;

// AFTER
const [targetAmount, setTargetAmount] = useState<number>(0);
// Initialize: setTargetAmount(currentTarget ?? 0);
// Submit: const amount = targetAmount || null;
```

## What NOT To Do

1. Do NOT modify Zod schemas — they already accept `number` via `z.coerce.number()`
2. Do NOT change API routes or database
3. Do NOT install external formatting libraries
4. Do NOT apply CurrencyInput to `installmentDuration` or `totalInstallments` fields (integer counts)
5. Do NOT use `type="number"` — commas are invalid in number inputs
