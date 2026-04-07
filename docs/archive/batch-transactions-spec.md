# Batch Transactions Refactor -- Specification

## Problem

Money Map is deployed on Vercel with Supabase's **Transaction mode pooler** (PgBouncer, port 6543). Prisma interactive transactions (`db.$transaction(async (tx) => {...})`) are incompatible with PgBouncer transaction mode because PgBouncer can reassign the backend Postgres connection between statements within an interactive transaction, causing **P2028 errors** ("Transaction not found").

The app currently has **15 interactive transactions** across 11 API route files. All of them must be converted to batch (non-interactive) transactions (`db.$transaction([op1, op2, op3])`) which send all operations in a single round-trip and are fully compatible with PgBouncer.

## Scope

- **In scope:** Convert all 15 `db.$transaction(async (tx) => {...})` calls to `db.$transaction([...])` batch form.
- **Out of scope:** No database migrations, no schema changes, no UI changes, no new features.

## Constraints

- This is a **pure backend refactor** -- no visible behavior change.
- All conditional logic (e.g., "did the account change?") must be resolved **before** building the operations array.
- The batch form still provides atomicity (all-or-nothing).
- Post-transaction side effects (`onExpenseTransactionChange`, `onTransferTransactionChange`, `onIncomeTransactionChange`) remain outside the transaction -- they are separate non-transactional queries and are unaffected.
- No database migration is needed.

## Affected Files (15 transactions across 11 files)

| # | File | Method | Line | Complexity |
|---|------|--------|------|------------|
| 1 | `src/app/api/income-transactions/route.ts` | POST | 188 | Simple |
| 2 | `src/app/api/income-transactions/[id]/route.ts` | PATCH | 117 | Conditional branching |
| 3 | `src/app/api/income-transactions/[id]/route.ts` | DELETE | 271 | Simple |
| 4 | `src/app/api/expense-transactions/route.ts` | POST | 256 | Inter-create dependency |
| 5 | `src/app/api/expense-transactions/[id]/route.ts` | PATCH | 161 | Conditional branching |
| 6 | `src/app/api/expense-transactions/[id]/route.ts` | DELETE | 357 | Simple (conditional) |
| 7 | `src/app/api/transfer-transactions/route.ts` | POST | 209 | Inter-create dependency |
| 8 | `src/app/api/transfer-transactions/[id]/route.ts` | PATCH | 138 | Complex conditional |
| 9 | `src/app/api/transfer-transactions/[id]/route.ts` | DELETE | 373 | Simple (conditional) |
| 10 | `src/app/api/expense-types/route.ts` | POST | 93 | Inter-create dependency |
| 11 | `src/app/api/expense-types/[id]/route.ts` | PATCH | 90 | Sequential CRUD |
| 12 | `src/app/api/expense-types/[id]/route.ts` | DELETE | 215 | Find-or-create |
| 13 | `src/app/api/transfer-types/[id]/route.ts` | DELETE | 150 | Find-or-create |
| 14 | `src/app/api/income-types/[id]/route.ts` | DELETE | 150 | Find-or-create |
| 15 | `src/app/api/cron/process-installments/route.ts` | POST | 64 | Simple |

## Conversion Patterns

### Pattern A: Simple Sequential (transactions 1, 3, 6, 9, 15)

These have no conditional branching inside the transaction. Convert directly.

**Before:**
```ts
await db.$transaction(async (tx) => {
  await tx.incomeTransaction.delete({ where: { id, userId } });
  await tx.financialAccount.update({ where: { id: accountId }, data: { currentBalance: { decrement: amount } } });
});
```

**After:**
```ts
await db.$transaction([
  db.incomeTransaction.delete({ where: { id, userId } }),
  db.financialAccount.update({ where: { id: accountId }, data: { currentBalance: { decrement: amount } } }),
]);
```

For conditional operations (transactions 6, 9), build the array conditionally BEFORE calling `$transaction`:

```ts
const operations = [];
if (!existingExpense.isSystemGenerated) {
  operations.push(db.financialAccount.update({ ... }));
}
operations.push(db.expenseTransaction.delete({ ... }));
await db.$transaction(operations);
```

### Pattern B: Conditional Branching (transactions 2, 5, 8)

These have if/else logic that determines which balance operations to run. Hoist ALL branching above the `$transaction` call, then build the operations array.

**Before (income PATCH):**
```ts
const result = await db.$transaction(async (tx) => {
  // ...build updateData...
  if (amount !== undefined) {
    if (accountId !== existingTransaction.accountId) {
      await tx.financialAccount.update({ /* reverse old */ });
      await tx.financialAccount.update({ /* apply new */ });
    } else {
      await tx.financialAccount.update({ /* apply diff */ });
    }
  }
  return await tx.incomeTransaction.update({ ... });
});
```

**After:**
```ts
// Resolve all conditions BEFORE the transaction
const operations: PrismaPromise<unknown>[] = [];

// ... build updateData object (same logic, just outside the callback) ...

if (amount !== undefined) {
  if (accountId !== undefined && accountId !== existingTransaction.accountId) {
    operations.push(db.financialAccount.update({ /* reverse old */ }));
    operations.push(db.financialAccount.update({ /* apply new */ }));
  } else {
    operations.push(db.financialAccount.update({ /* apply diff */ }));
  }
} else if (accountId !== undefined && accountId !== existingTransaction.accountId) {
  operations.push(db.financialAccount.update({ /* reverse old */ }));
  operations.push(db.financialAccount.update({ /* apply new */ }));
}

operations.push(db.incomeTransaction.update({ where: { id, userId }, data: updateData }));

const results = await db.$transaction(operations);
const updatedTransaction = results[results.length - 1]; // last operation is the update
```

### Pattern C: Inter-Create Dependencies (transactions 4, 7, 10)

These create a record and then reference its auto-generated ID in subsequent operations. Since batch transactions cannot reference earlier results, use one of two strategies:

**Strategy: Pre-generate IDs with `crypto.randomUUID()`**

Prisma's `@default(uuid())` on the `id` column means the DB generates the ID if none is provided. But Prisma also accepts an explicit `id` in the `data` block. By generating the ID client-side, all operations can reference it in the same batch.

**Before (expense types POST):**
```ts
const result = await db.$transaction(async (tx) => {
  const expenseType = await tx.expenseType.create({ data: { userId, name, monthlyBudget } });
  await tx.expenseSubcategory.createMany({
    data: subcategories.map(sub => ({ userId, expenseTypeId: expenseType.id, name: sub.name }))
  });
  return await tx.expenseType.findUnique({ where: { id: expenseType.id }, include: { subcategories: true } });
});
```

**After:**
```ts
import { randomUUID } from 'crypto';

const expenseTypeId = randomUUID();
const operations: PrismaPromise<unknown>[] = [];

operations.push(db.expenseType.create({ data: { id: expenseTypeId, userId, name, monthlyBudget } }));

if (subcategories?.length > 0) {
  operations.push(db.expenseSubcategory.createMany({
    data: subcategories.map(sub => ({ userId, expenseTypeId, name: sub.name }))
  }));
}

await db.$transaction(operations);

// Re-read outside the transaction (non-critical, read-only)
const result = await db.expenseType.findUnique({ where: { id: expenseTypeId }, include: { subcategories: true } });
```

### Pattern D: Find-or-Create (transactions 12, 13, 14)

These find an "Uncategorized" type and create it if missing, then use its ID. Move the find-or-create OUTSIDE the transaction (it is idempotent and safe), then use the known ID in the batch.

**Before (expense types DELETE):**
```ts
const result = await db.$transaction(async (tx) => {
  let uncategorizedType = await tx.expenseType.findFirst({ where: { userId, name: 'Uncategorized' } });
  if (!uncategorizedType) {
    uncategorizedType = await tx.expenseType.create({ data: { userId, name: 'Uncategorized' } });
  }
  await tx.expenseTransaction.updateMany({ where: { expenseTypeId: id }, data: { expenseTypeId: uncategorizedType.id } });
  await tx.expenseType.delete({ where: { id, userId } });
});
```

**After:**
```ts
// Find or create "Uncategorized" BEFORE the transaction (idempotent)
let uncategorizedType = await db.expenseType.findFirst({ where: { userId, name: 'Uncategorized' } });
if (!uncategorizedType) {
  uncategorizedType = await db.expenseType.create({ data: { userId, name: 'Uncategorized', monthlyBudget: null } });
}

await db.$transaction([
  db.expenseTransaction.updateMany({ where: { expenseTypeId: id }, data: { expenseTypeId: uncategorizedType.id } }),
  db.expenseType.delete({ where: { id, userId } }),
]);
```

Note: The `count` check before `updateMany` is unnecessary -- `updateMany` with zero matches is a no-op. Remove the `count` call to simplify.

### Pattern E: Expense Types PATCH (transaction 11)

This has dynamic subcategory CRUD with a variable number of update operations (one per subcategory to update). Build the operations array dynamically.

**After:**
```ts
const operations: PrismaPromise<unknown>[] = [];

operations.push(db.expenseType.update({ where: { id, userId }, data: { name, monthlyBudget } }));

if (subcategoryChanges) {
  if (toCreate?.length > 0) {
    operations.push(db.expenseSubcategory.createMany({ data: toCreate.map(...) }));
  }
  if (toUpdate?.length > 0) {
    for (const sub of toUpdate) {
      operations.push(db.expenseSubcategory.update({ where: { id: sub.id, userId }, data: { name: sub.name } }));
    }
  }
  if (toDelete?.length > 0) {
    operations.push(db.expenseSubcategory.deleteMany({ where: { id: { in: toDelete }, userId } }));
  }
}

await db.$transaction(operations);

// Re-read outside the transaction
const result = await db.expenseType.findUnique({ where: { id }, include: { subcategories: { orderBy: { name: 'asc' } } } });
```

### Pattern F: Transfer PATCH (transaction 8) -- Most Complex

This is the most complex transaction with fee handling (add/remove/update) interleaved with account balance adjustments. The same pattern applies: resolve all conditions before building the array.

Key considerations:
- The `findFirst` for "Transfer fee" expense type and the `findUnique` for account name must be moved BEFORE the transaction.
- Fee creation needs a pre-generated ID if the fee expense ID needs to be stored on the transfer record.
- All conditional fee + balance operations are built into the array based on pre-resolved conditions.

## Typing

Import `PrismaPromise` from `@prisma/client` for typing the operations array:

```ts
import { PrismaPromise } from '@prisma/client';

const operations: PrismaPromise<unknown>[] = [];
```

This type is what `db.$transaction()` expects for the batch form.

## Verification Plan

For each converted file:

1. **Lint:** `npm run lint` must pass with no new errors.
2. **Build:** `npm run build` must succeed with zero errors.
3. **Manual verification:** The Builder should confirm that each converted transaction:
   - Uses `db.$transaction([...])` (array form), not `db.$transaction(async (tx) => {...})` (callback form).
   - Has all conditional logic resolved before the `$transaction` call.
   - Preserves the exact same operations and data flow as the original.
   - Does not use `tx.` anywhere (the `tx` client no longer exists).

## Handoff Note for Builder

This is a backend-only refactor. No UI, no migrations, no new dependencies (except importing `randomUUID` from Node's built-in `crypto` module and `PrismaPromise` from `@prisma/client`).

**Execution order recommendation:** Start with the simplest files (Pattern A) to build confidence, then move to Pattern B, then C/D, and finish with the complex transfer PATCH (Pattern F). The plan XML reflects this ordering.

**Key rules:**
- Every `tx.` reference must become `db.` since there is no transaction client in batch mode.
- All `findFirst`/`findUnique` lookups that were inside the transaction for the purpose of reading data (not for atomicity) should be moved BEFORE the transaction.
- The `re-read` operations that existed at the end of some transactions (e.g., expense types POST/PATCH fetching the type with subcategories) should be moved AFTER the transaction as a separate query.
- For operations that need a previously-created record's ID, use `randomUUID()` to pre-generate the ID.
- Remove unnecessary `count` checks before `updateMany` -- `updateMany` on zero rows is a no-op.
- Remove `{ timeout: 10000 }` options from the old interactive transactions -- batch transactions do not accept this option.
