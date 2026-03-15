# Fix Transaction Update 400 Errors

## Problem Statement

Editing income and transfer transactions returns a 400 error ("Failed to update [type] transaction") while expense transaction updates work correctly. The root cause is that the server-side Zod validation schemas for income and transfer PATCH endpoints reject `null` values from nullable database columns.

## Root Cause (Confirmed via Error Evidence)

### The Validation Mismatch

The server schemas use `z.string().optional()` which accepts `string | undefined` but **rejects `null`**. Nullable database columns (`description`, `notes`) return `null` from Prisma when unset. When the frontend populates the edit form with this data and submits without touching those fields, `null` propagates to the server and Zod rejects it.

**Confirmed errors from testing:**
- Income update (change date): `{"fieldErrors":{"description":["Invalid input"]}}`
- Transfer update (credit card): `{"fieldErrors":{"amount":["Invalid input"],"notes":["Invalid input"]}}`
- Transfer update (account, change date): `{"fieldErrors":{"description":["Invalid input"]}}`

### Why Expense Updates Work

The expense PATCH schema already handles this correctly:
- All fields are `.optional()` (proper PATCH semantics)
- Nullable fields use `.nullable().optional()` (e.g., `description: z.string().nullable().optional()`)
- Update data is built dynamically — only provided fields are included

### Architectural Inconsistency

| Aspect | Expense PATCH (works) | Income PATCH (fails) | Transfer PATCH (fails) |
|---|---|---|---|
| Schema fields | All `.optional()` | All **required** | All **required** |
| Nullable handling | `.nullable().optional()` | `.optional()` only | `.optional()` only |
| Update strategy | Dynamic `updateData` object | Destructures all fields | Destructures all fields |

## Fix Strategy

Align the income and transfer PATCH routes with the expense PATCH pattern:

1. Make all server schema fields `.optional()` with `.nullable()` where the DB column is nullable
2. Build `updateData` dynamically (only include fields that were provided)
3. Handle balance adjustments correctly based on which fields actually changed

## Scope

### In Scope
- **Income PATCH route** (`src/app/api/income-transactions/[id]/route.ts`): Fix server schema, build dynamic updateData, fix account-change balance handling
- **Transfer PATCH route** (`src/app/api/transfer-transactions/[id]/route.ts`): Fix server schema, build dynamic updateData, fix `accountsChanged` logic bug (uses `===` instead of `!==`, breaks when both accounts change simultaneously)
- **Hook error messages** (`src/hooks/useIncomeTransactionsQuery.ts`, `src/hooks/useTransferTransactionsQuery.ts`): Already updated during investigation — keep the improved error messages

### Out of Scope
- Expense PATCH route (already works correctly)
- Frontend form components (no changes needed — the issue is server-side)
- Database schema changes (no migrations required)

## Detailed Changes

### 1. Income PATCH Server Schema

**Before:**
```typescript
const ServerPatchIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.string().min(1, "Amount is required").refine(...),
  accountId: z.string().min(1, "Account is required"),
  incomeTypeId: z.string().min(1, "Income type is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().max(500).optional(),
});
```

**After:**
```typescript
const ServerPatchIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  accountId: z.string().min(1, "Account is required").optional(),
  incomeTypeId: z.string().min(1, "Income type is required").optional(),
  date: z.string().min(1, "Date is required").optional(),
  description: z.string().max(500).nullable().optional(),
});
```

### 2. Income PATCH Update Logic

Replace the direct destructure + update pattern with the expense-style dynamic `updateData` builder:
- Only include fields that are present in the request
- Handle account changes: when `accountId` changes, restore balance to old account and apply to new account
- Handle amount changes on the same account vs different account

### 3. Transfer PATCH Server Schema

**Before:**
```typescript
const ServerPatchTransferSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.string().min(1, "Amount is required").refine(...),
  fromAccountId: z.string().min(1, "From account is required"),
  toAccountId: z.string().min(1, "To account is required"),
  transferTypeId: z.string().min(1, "Transfer type is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  feeAmount: z.string().optional().refine(...),
}).refine((data) => data.fromAccountId !== data.toAccountId, ...);
```

**After:**
```typescript
const ServerPatchTransferSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  fromAccountId: z.string().min(1, "From account is required").optional(),
  toAccountId: z.string().min(1, "To account is required").optional(),
  transferTypeId: z.string().min(1, "Transfer type is required").optional(),
  date: z.string().min(1, "Date is required").optional(),
  notes: z.string().nullable().optional(),
  feeAmount: z.string().nullable().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: "Fee amount must be a positive number" }
  ),
}).refine(
  (data) => {
    if (data.fromAccountId !== undefined && data.toAccountId !== undefined) {
      return data.fromAccountId !== data.toAccountId;
    }
    return true;
  },
  { message: "From account and to account must be different", path: ["toAccountId"] }
);
```

### 4. Transfer PATCH Update Logic

- Build `updateData` dynamically (same pattern as expense)
- Fix `accountsChanged` variable: change `===` to `!==` so it correctly detects when accounts have changed
- Adjust balance logic to only run reversal/reapply when accounts actually changed

### 5. Hook Error Messages (Already Done)

The income and transfer hooks now read the API error response body and surface Zod validation details in the error message. These changes were made during investigation and should be kept.

## Testing Plan

1. **Income — edit name only**: Should succeed without touching description
2. **Income — edit date only**: Should succeed (was failing with description error)
3. **Income — edit all fields**: Should succeed
4. **Income — change account**: Should succeed AND correctly adjust both old and new account balances
5. **Transfer — edit date only**: Should succeed without touching notes
6. **Transfer — edit amount only**: Should succeed
7. **Transfer — edit all fields**: Should succeed
8. **Transfer — change both accounts**: Should succeed with correct balance reversal/reapply
9. **Expense — edit any field**: Should still work (regression check)

---

## Handoff Note for Builder

**Feature:** Fix transaction update 400 errors
**Branch name suggestion:** `fix/transaction-update-validation`
**Files most likely to be affected:**
- `src/app/api/income-transactions/[id]/route.ts` — schema + PATCH handler rewrite
- `src/app/api/transfer-transactions/[id]/route.ts` — schema + PATCH handler rewrite
- `src/hooks/useIncomeTransactionsQuery.ts` — already updated (keep changes)
- `src/hooks/useTransferTransactionsQuery.ts` — already updated (keep changes)

**Watch out for:**
- The expense PATCH route at `src/app/api/expense-transactions/[id]/route.ts` is the reference implementation — match its patterns
- The transfer PATCH has complex fee handling logic (create/update/delete fee expenses) — preserve this exactly, just wrap it in the dynamic update pattern
- The `onIncomeTransactionChange` and `onTransferTransactionChange` calls for statement recalculation must still fire for both old and new dates/accounts when they change
- Do NOT touch the database or run migrations — this fix is purely server-side TypeScript

**Verification focus:**
- Test with transactions that have `null` description/notes (the exact scenario that was failing)
- Verify account balances are correct after editing income transactions with account changes
- Verify the transfer fee logic still works correctly (add fee, remove fee, change fee amount)
- Run `npm run lint` and `npm run build` to ensure no regressions
