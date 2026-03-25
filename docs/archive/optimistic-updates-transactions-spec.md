# Optimistic Updates -- Transactions (Phase 1)

> Spec for adding optimistic create and delete to expense, income, and transfer transactions.

## Objectives

1. **Instant perceived feedback** on create and delete actions -- the UI updates immediately without waiting for server confirmation.
2. **Reliable rollback** on mutation failure -- the cache is restored to its pre-mutation state and the user sees an error toast.
3. **Correct cache management** across two cache layers: the paginated list cache (e.g., `expenseTransactions`) and the flat `recentTransactions` cache.

## Scope

### In scope

- Optimistic **create** and **delete** for expenses, income, and transfers
- Both the paginated list cache AND `recentTransactions` cache
- Error rollback with error toast on mutation failure
- Success toast fires immediately on submit (not after server confirmation)
- Delete dialog closes immediately on confirm (before mutation resolves)

### Out of scope

- Optimistic updates for **edits** (separate effort)
- Aggregate caches: `accounts`, `netWorth`, `monthlySummary`, `budgetStatus`, `annualSummary`, `expenseBreakdown`, `incomeBreakdown` (Phase 2 -- these continue to invalidate on `onSettled`)
- "Undo via toast" feature (separate feature)
- Optimistic **updates/edits** (separate effort)

---

## Technical Design

### 1. The Optimistic Update Pattern

Every create and delete mutation will follow this lifecycle:

```
onMutate (optimistic)
  1. Cancel outgoing refetches for affected query keys
  2. Snapshot current cache state (for rollback)
  3. Apply optimistic update to cache via setQueryData / setQueriesData
  4. Return { previousData } context object

onError (rollback)
  1. Restore cache from context.previousData
  2. Show error toast

onSettled (sync)
  1. Invalidate ALL query keys that were previously in onSuccess
     (same list -- accounts, netWorth, etc.)
  This ensures the server truth replaces the optimistic objects.
```

**Why `onSettled` instead of `onSuccess` for invalidation:** `onSettled` fires on both success AND error. After an error rollback, we still want to refetch to ensure the cache matches the server. This is the pattern recommended by the TanStack Query docs.

### 2. Optimistic Object Builders

Each transaction type needs a function that builds a fake "optimistic" object from form data. These objects will have a temporary `id` (prefixed with `optimistic-` to distinguish them) and will be replaced by the real server object when `onSettled` invalidation completes.

#### 2a. Expense Transaction Optimistic Object

```typescript
function buildOptimisticExpense(
  formValues: Record<string, unknown>,
  meta: { accountName: string; expenseTypeName: string; subcategoryName?: string }
): ExpenseTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',                           // Not displayed in table
    accountId: formValues.accountId as string,
    expenseTypeId: formValues.expenseTypeId as string,
    expenseSubcategoryId: (formValues.expenseSubcategoryId === 'none' ? null : formValues.expenseSubcategoryId) as string | null,
    name: formValues.name as string,
    amount: formValues.amount as string,   // ExpenseTransaction.amount is string
    date: formValues.date ? formatDateForAPI(formValues.date as Date) : now,
    description: (formValues.description as string) || null,
    isInstallment: formValues.isInstallment as boolean,
    installmentDuration: (formValues.installmentDuration as number) || null,
    remainingInstallments: (formValues.installmentDuration as number) || null,
    installmentStartDate: formValues.installmentStartDate
      ? formatDateForAPI(formValues.installmentStartDate as Date)
      : null,
    monthlyAmount: null,
    createdAt: now,
    updatedAt: now,
    account: { id: formValues.accountId as string, name: meta.accountName },
    expenseType: { id: formValues.expenseTypeId as string, name: meta.expenseTypeName },
    expenseSubcategory: meta.subcategoryName
      ? { id: (formValues.expenseSubcategoryId as string), name: meta.subcategoryName }
      : null,
    tags: [],                              // Tags are not optimistically resolved
  };
}
```

#### 2b. Income Transaction Optimistic Object

```typescript
function buildOptimisticIncome(
  formValues: Record<string, unknown>,
  meta: { accountName: string; incomeTypeName: string }
): IncomeTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',
    accountId: formValues.accountId as string,
    incomeTypeId: formValues.incomeTypeId as string,
    name: formValues.name as string,
    amount: formValues.amount as string,   // IncomeTransaction.amount is string
    date: formValues.date ? formatDateForAPI(formValues.date as Date) : now,
    description: (formValues.description as string) || null,
    createdAt: now,
    updatedAt: now,
    account: { id: formValues.accountId as string, name: meta.accountName },
    incomeType: { id: formValues.incomeTypeId as string, name: meta.incomeTypeName },
    tags: [],
  };
}
```

#### 2c. Transfer Optimistic Object

```typescript
function buildOptimisticTransfer(
  formValues: Record<string, unknown>,
  meta: { fromAccountName: string; toAccountName: string; transferTypeName: string }
): TransferTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',
    name: formValues.name as string,
    amount: parseFloat(formValues.amount as string),  // TransferTransaction.amount is number
    fromAccountId: formValues.fromAccountId as string,
    toAccountId: formValues.toAccountId as string,
    transferTypeId: formValues.transferTypeId as string,
    date: formValues.date ? formatDateForAPI(formValues.date as Date) : now,
    notes: (formValues.notes as string) || null,
    feeAmount: formValues.feeAmount ? parseFloat(formValues.feeAmount as string) : null,
    feeExpenseId: null,
    createdAt: now,
    updatedAt: now,
    fromAccount: { id: formValues.fromAccountId as string, name: meta.fromAccountName, currentBalance: 0 },
    toAccount: { id: formValues.toAccountId as string, name: meta.toAccountName, currentBalance: 0 },
    transferType: { id: formValues.transferTypeId as string, name: meta.transferTypeName },
    feeExpense: null,
    tags: [],
  };
}
```

#### 2d. RecentTransaction Optimistic Object

Each builder above also needs to produce a `RecentTransaction` for the flat recent list:

```typescript
function buildOptimisticRecentTransaction(
  type: TransactionType,
  name: string,
  amount: number,        // Always number for RecentTransaction
  date: string,
  accountId: string,
  accountName: string,
  categoryId: string,
  categoryName: string,
  toAccountId?: string,
  toAccountName?: string,
): RecentTransaction {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    type,
    name,
    amount,
    date,
    accountId,
    accountName,
    categoryId,
    categoryName,
    toAccountId,
    toAccountName,
  };
}
```

### 3. Create Mutation -- Optimistic Flow

#### Conditions for optimistic prepend

The optimistic object should ONLY be prepended to the paginated list cache when ALL of these conditions are true:

1. **`skip === 0`** -- the user is viewing the first page
2. **No active search** -- `search` is falsy (empty string or undefined)
3. **Date filter includes today** -- `dateFilter` is `undefined`, `'view-all'`, `'this-month'` (and today is within the current month), or `'this-year'` (and today is within the current year). For simplicity: if `dateFilter` is `undefined` or `'view-all'`, always prepend. If `'this-month'` or `'this-year'`, always prepend (it is safe to assume the user is operating in the present). Any other custom filter value: skip prepend.

If conditions are NOT met, the optimistic prepend is skipped for the list cache, but the mutation still fires normally. The `onSettled` invalidation will bring in the new item when the user navigates to the appropriate page/filter.

**For `recentTransactions`:** ALWAYS optimistically prepend (no conditions). Trim to 5 items after prepend to match the server's limit.

#### onMutate implementation (create)

```typescript
onMutate: async (newTransactionData) => {
  // 1. Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions });
  await queryClient.cancelQueries({ queryKey: ['recentTransactions'] });

  // 2. Snapshot ALL matching paginated caches
  const previousTransactions = queryClient.getQueriesData({
    queryKey: QUERY_KEYS.expenseTransactions,
  });
  const previousRecent = queryClient.getQueryData(['recentTransactions']);

  // 3. Build optimistic objects
  const optimisticTransaction = buildOptimisticExpense(newTransactionData, meta);
  const optimisticRecent = buildOptimisticRecentTransaction(...);

  // 4. Update paginated cache (only first-page, no-search entries)
  queryClient.setQueriesData(
    { queryKey: QUERY_KEYS.expenseTransactions },
    (old: ExpenseTransactionsResponse | undefined) => {
      if (!old) return old;
      // Determine if this cache entry is a first-page, no-search entry
      // by checking the queryKey params (available via the predicate form)
      // For simplicity: use setQueriesData with predicate
      return old; // (see detailed logic below)
    }
  );

  // 5. Update recentTransactions (always)
  queryClient.setQueryData(
    ['recentTransactions'],
    (old: RecentTransaction[] | undefined) => {
      if (!old) return [optimisticRecent];
      return [optimisticRecent, ...old].slice(0, 5);
    }
  );

  return { previousTransactions, previousRecent };
}
```

**Detailed paginated cache update logic:**

Use `queryClient.setQueriesData` with a predicate to selectively update only eligible cache entries:

```typescript
queryClient.setQueriesData<ExpenseTransactionsResponse>(
  {
    queryKey: QUERY_KEYS.expenseTransactions,
    predicate: (query) => {
      const params = query.queryKey[1] as UseExpenseTransactionsOptions | undefined;
      if (!params) return true; // No params means default view
      const isFirstPage = !params.skip || params.skip === 0;
      const noSearch = !params.search;
      const dateOk = !params.dateFilter || params.dateFilter === 'view-all'
        || params.dateFilter === 'this-month' || params.dateFilter === 'this-year';
      return isFirstPage && noSearch && dateOk;
    },
  },
  (old) => {
    if (!old) return old;
    return {
      ...old,
      transactions: [optimisticTransaction, ...old.transactions],
      total: old.total + 1,
    };
  }
);
```

#### onError implementation (create)

```typescript
onError: (_error, _variables, context) => {
  // Restore all paginated caches from snapshot
  if (context?.previousTransactions) {
    context.previousTransactions.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
  // Restore recentTransactions
  if (context?.previousRecent !== undefined) {
    queryClient.setQueryData(['recentTransactions'], context.previousRecent);
  }

  // Error toast
  toast.error("Failed to create expense transaction", {
    description: "The transaction could not be saved. Please try again.",
    duration: 6000,
  });
}
```

#### onSettled implementation (create)

```typescript
onSettled: () => {
  // Same invalidation list as current onSuccess -- ensures server truth replaces optimistic objects
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['cards'] });
  queryClient.invalidateQueries({ queryKey: ['netWorth'] });
  queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
  queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
  queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
  queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
  queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
  queryClient.invalidateQueries({ queryKey: ['expenseBreakdown'] });
}
```

### 4. Delete Mutation -- Optimistic Flow

#### onMutate implementation (delete)

```typescript
onMutate: async (deletedId: string) => {
  // 1. Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions });
  await queryClient.cancelQueries({ queryKey: ['recentTransactions'] });

  // 2. Snapshot
  const previousTransactions = queryClient.getQueriesData({
    queryKey: QUERY_KEYS.expenseTransactions,
  });
  const previousRecent = queryClient.getQueryData(['recentTransactions']);

  // 3. Remove from ALL paginated cache entries (not just first page)
  queryClient.setQueriesData<ExpenseTransactionsResponse>(
    { queryKey: QUERY_KEYS.expenseTransactions },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        transactions: old.transactions.filter(t => t.id !== deletedId),
        total: Math.max(0, old.total - 1),
      };
    }
  );

  // 4. Remove from recentTransactions
  queryClient.setQueryData<RecentTransaction[]>(
    ['recentTransactions'],
    (old) => {
      if (!old) return old;
      return old.filter(t => t.id !== deletedId);
    }
  );

  return { previousTransactions, previousRecent };
}
```

#### onError implementation (delete)

```typescript
onError: (_error, _variables, context) => {
  // Same rollback pattern as create
  if (context?.previousTransactions) {
    context.previousTransactions.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
  if (context?.previousRecent !== undefined) {
    queryClient.setQueryData(['recentTransactions'], context.previousRecent);
  }

  toast.error("Failed to delete expense transaction", {
    description: "The transaction could not be deleted. Please try again.",
    duration: 6000,
  });
}
```

#### onSettled implementation (delete)

Same as create -- invalidate all related query keys.

### 5. Drawer Changes (Create Flow)

The create drawers currently `await` the mutation, then show a success toast and close. The new flow:

```
Before (current):
  1. await createExpenseTransaction(payload)   // blocks
  2. toast.success(...)                        // after server confirms
  3. form.reset()
  4. onOpenChange(false)                       // drawer closes

After (optimistic):
  1. toast.success(...)                        // IMMEDIATELY
  2. form.reset()
  3. onOpenChange(false)                       // drawer closes IMMEDIATELY
  4. createExpenseTransaction(payload)          // fire-and-forget (not awaited)
     // onMutate handles optimistic cache update
     // onError handles rollback + error toast
     // onSettled handles invalidation
```

**Key changes in each drawer's `onSubmit`:**
- Remove `try/catch` block (error handling moves to `onError` in the hook)
- Remove `await` -- use `.mutate()` instead of `.mutateAsync()` (or call `mutateAsync` without `await`)
- Move `toast.success`, `form.reset()`, and `onOpenChange(false)` BEFORE the mutation call
- The mutation call becomes fire-and-forget

**Important:** The hook must now accept metadata (account name, type name, subcategory name) with the mutation variables so that `onMutate` can build the optimistic object. This means the `mutationFn` wrapper and the `onMutate` handler both receive the same enriched payload:

```typescript
// The mutation's variables type becomes:
type CreateExpenseVariables = {
  payload: Record<string, unknown>;  // The API payload (same as today)
  meta: {                            // Display-only metadata for optimistic object
    accountName: string;
    expenseTypeName: string;
    subcategoryName?: string;
  };
};

// mutationFn only sends payload to the API:
mutationFn: (variables: CreateExpenseVariables) => createExpenseTransaction(variables.payload),

// onMutate uses both payload and meta:
onMutate: async (variables: CreateExpenseVariables) => {
  const optimistic = buildOptimisticExpense(variables.payload, variables.meta);
  // ...
}
```

The drawers must look up the display names from their already-loaded arrays and include them in the mutation call:

```typescript
// In CreateExpenseTransactionDrawer.onSubmit:
const accountName = allAccounts.find(a => a.id === payload.accountId)?.name ?? '';
const expenseTypeName = budgets.find(b => b.id === payload.expenseTypeId)?.name ?? '';
const subcategory = selectedExpenseType?.subcategories?.find(
  s => s.id === payload.expenseSubcategoryId
);

createExpenseTransaction({
  payload,
  meta: { accountName, expenseTypeName, subcategoryName: subcategory?.name },
});
```

### 6. Desktop Table Changes (Delete Flow)

The delete confirmation flow currently awaits the mutation and then closes the dialog. The new flow:

```
Before (current):
  1. User clicks confirm in delete dialog
  2. await deleteExpenseTransaction(id)      // blocks, shows "Deleting..." spinner
  3. setDeleteDialogOpen(false)
  4. toast.success(...)

After (optimistic):
  1. User clicks confirm in delete dialog
  2. setDeleteDialogOpen(false)              // close IMMEDIATELY
  3. setTransactionToDelete(null)
  4. setEditedRows({})
  5. toast.success(...)                      // success toast IMMEDIATELY
  6. deleteExpenseTransaction(id)            // fire-and-forget
     // onMutate removes from list instantly
     // onError restores + error toast
     // onSettled invalidates
```

**Key changes in each table's `handleDeleteConfirm`:**
- Remove `try/catch` block
- Remove `await`
- Move dialog close, state reset, and success toast BEFORE the mutation call
- The `isDeleting` flag on the dialog buttons is no longer needed (dialog closes instantly), but keep the flag in the hook return for backward compatibility

### 7. Mobile Edit Drawer Changes (Delete Flow)

Delete on mobile is handled in `EditExpenseDrawer`, `EditIncomeDrawer`, and `EditTransferDrawer` — not in `TransactionsMobileView`. Each drawer has its own `handleDeleteConfirm` that currently `await`s the mutation before closing.

**Current mobile delete flow (same problem as desktop):**
```
  1. User taps "Delete expense" → DeleteDialog opens
  2. User confirms
  3. await deleteExpenseTransaction(id)      // blocks, button shows "Deleting..."
  4. setDeleteDialogOpen(false)
  5. onOpenChange(false)                     // drawer closes
  6. toast.success(...)
```

**New mobile delete flow (optimistic):**
```
  1. User taps "Delete expense" → DeleteDialog opens (same)
  2. User confirms
  3. setDeleteDialogOpen(false)              // close dialog IMMEDIATELY
  4. onOpenChange(false)                     // close drawer IMMEDIATELY
  5. toast.success(...)                      // success toast IMMEDIATELY
  6. deleteExpenseTransaction(id)            // fire-and-forget
     // onMutate removes from list instantly (same hook as desktop)
     // onError restores + error toast
     // onSettled invalidates
```

**Key changes in each edit drawer's `handleDeleteConfirm`:**
- Remove `try/catch` block and `await`
- Capture the transaction ID in a local const BEFORE clearing state
- Close dialog + drawer and fire success toast BEFORE calling the mutation
- The `isDeleting` prop on the delete button is no longer needed (dialog/drawer close instantly)
- The hook-level `onMutate`/`onError`/`onSettled` are shared with the desktop table — no extra hook changes needed

**Files affected:**
- `src/components/forms/EditExpenseDrawer.tsx`
- `src/components/forms/EditIncomeDrawer.tsx`
- `src/components/forms/EditTransferDrawer.tsx`

### 8. Mutation Variables Type Changes Summary

| Hook | Current mutationFn signature | New variables type |
|------|-----------------------------|--------------------|
| `useExpenseTransactionsQuery` create | `(data: Record<string, unknown>) => Promise<ExpenseTransaction>` | `{ payload: Record<string, unknown>; meta: { accountName, expenseTypeName, subcategoryName? } }` |
| `useIncomeTransactionsQuery` create | `(data: Record<string, unknown>) => Promise<IncomeTransaction>` | `{ payload: Record<string, unknown>; meta: { accountName, incomeTypeName } }` |
| `useTransfersQuery` create | `(data: Record<string, unknown>) => Promise<TransferTransaction>` | `{ payload: Record<string, unknown>; meta: { fromAccountName, toAccountName, transferTypeName } }` |
| All delete mutations | `(id: string) => Promise<void>` | **No change** -- `id` is sufficient |

### 10. Bugfix: Snapshot Corruption + Stale `isDeleting` on Mobile Delete

Two bugs were discovered during verification that cause mobile edit drawer deletes to fail and cascade into breaking desktop table deletes.

#### Bug A — `getQueriesData` snapshots `undefined` entries (cascade corruption)

**Root cause:** The edit drawers call `useExpenseTransactionsQuery()` with no options. This registers a list query with key `['expenseTransactions', { skip: undefined, take: undefined, ... }]` that either has `undefined` data or an empty response. When `onMutate` runs `getQueriesData({ queryKey: ['expenseTransactions'] })`, this bare entry is included in the snapshot as `[key, undefined]`.

On rollback (`onError`), `setQueryData(key, undefined)` is called for that slot — this **wipes that cache entry to `undefined`**. Because `setQueriesData` uses prefix matching, the *table's* active cache entry (with real pagination params) is separate and unaffected by the rollback itself. However, the bare entry being set to `undefined` means that on *subsequent* deletes from the table, the `getQueriesData` snapshot again captures `[bareKey, undefined]`, and if that subsequent delete also errors, the rollback restores `undefined` to the bare entry — creating a cycle where every failed mutation leaves a corrupted cache entry behind.

More critically: if the bare entry *did* have data (the hook fetches on mount with no `enabled` guard), and the mobile delete fails, the rollback restores that data — but the bare query's `onSettled` invalidation refetches it, potentially racing with the table's own queries. This inconsistency causes the table to show stale data or blank rows after a mobile drawer delete failure.

**Fix:** Filter out `undefined` entries from the `getQueriesData` snapshot in `onMutate` for both create and delete mutations, across all three hooks:

```typescript
// In onMutate for both create and delete:
const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
  queryKey: QUERY_KEYS.expenseTransactions,
}).filter(([, data]) => data !== undefined);
```

This ensures rollback only restores cache entries that had real data, preventing `undefined` from being written back as a "restored" value.

**Files:** `useExpenseTransactionsQuery.ts`, `useIncomeTransactionsQuery.ts`, `useTransferTransactionsQuery.ts` — 6 `getQueriesData` calls total (2 per hook: one in create `onMutate`, one in delete `onMutate`).

#### Bug B — `isDeleting` still passed to `DeleteDialog` in edit drawers

**Root cause:** The optimistic refactor was supposed to remove `isDeleting` from the delete flow in the edit drawers (since the dialog closes immediately and there's nothing to disable). However, the `DeleteDialog` in all three edit drawers still receives `isDeleting={isDeleting}`.

`DeleteDialog` uses `isDeleting` to disable both Cancel and Delete buttons (`disabled={isDeleting}`). While the initial click fires `handleDeleteConfirm` successfully (since `isDeleting` is `false` at click time), the prop is still technically incorrect — the dialog closes immediately, so `isDeleting` should never be passed. More importantly, if a *previous* delete is still settling when the user opens the dialog again, `isDeleting` could be stale `true`, blocking the buttons.

**Fix:** Remove `isDeleting` from the `DeleteDialog` in all three edit drawers. Since the drawer and dialog close immediately on confirm, there is nothing to disable.

**Files:** `EditExpenseDrawer.tsx`, `EditIncomeDrawer.tsx`, `EditTransferDrawer.tsx` — remove `isDeleting={isDeleting}` from the `<DeleteDialog>` component in each.

### 9. What NOT To Do

- **Do not mutate cached data directly.** Always produce new objects immutably in `setQueryData` callbacks.
- **Do not skip `cancelQueries` before optimistic updates.** In-flight refetches can overwrite optimistic state.
- **Do not skip `onSettled` invalidation.** The optimistic object has a temporary ID that the server does not know about. The `onSettled` invalidation is what replaces the temp object with the real one.
- **Do not use `mutateAsync` with `await` + `try/catch` in components when the hook handles errors.** This creates double error handling. Use `mutate()` (fire-and-forget) or `mutateAsync()` without `await`.
- **Do not optimistically update aggregate caches** (accounts, netWorth, budgetStatus, etc.). These are complex derived values. Let them refresh via `onSettled` invalidation. This is Phase 2 territory.

---

## Verification Plan

For each transaction type (expense, income, transfer):

### Create -- Happy path
1. Open create drawer, fill form, submit
2. Verify: drawer closes immediately, success toast appears immediately
3. Verify: new item appears at top of list (if on first page, no search, compatible date filter)
4. Verify: item appears in recent transactions on dashboard
5. Wait for server response -- verify the optimistic item is replaced by real item (check that `id` no longer starts with `optimistic-`)

### Create -- Error path
1. Simulate server error (e.g., disconnect network or mock API failure)
2. Submit create form
3. Verify: success toast fires, drawer closes, optimistic item appears
4. Verify: after server error, optimistic item disappears (rollback), error toast appears
5. Verify: list returns to its pre-mutation state

### Create -- Skip conditions
1. Navigate to page 2 (skip > 0) and create a transaction
2. Verify: no optimistic item appears in the current page view
3. Enter a search term and create a transaction
4. Verify: no optimistic item appears in filtered results

### Delete (desktop table) -- Happy path
1. Click delete on a transaction, confirm in dialog
2. Verify: dialog closes immediately, success toast appears immediately
3. Verify: item is removed from the list instantly
4. Verify: item is removed from recent transactions
5. Wait for server response -- verify list state remains correct

### Delete (desktop table) -- Error path
1. Simulate server error
2. Confirm delete
3. Verify: dialog closes, item removed, success toast
4. Verify: after server error, item reappears (rollback), error toast appears

### Delete (mobile edit drawer) -- Happy path
1. Tap a transaction row to open the edit drawer
2. Tap "Delete [type]" at the bottom, confirm in dialog
3. Verify: dialog closes immediately, drawer closes immediately, success toast
4. Verify: item is removed from the mobile list instantly
5. Verify: item is removed from recent transactions on dashboard

### Delete (mobile edit drawer) -- Error path
1. Simulate server error
2. Open edit drawer, confirm delete
3. Verify: drawer and dialog close, success toast fires
4. Verify: after server error, item reappears in mobile list (rollback), error toast appears

### Build verification
- `npm run lint` passes
- `npm run build` passes
- No TypeScript errors

---

## Handoff Note for Builder

**Feature:** Optimistic Updates -- Transactions
**Branch name suggestion:** `feature/optimistic-updates-transactions`
**Files most likely to be affected:**
- `src/hooks/useExpenseTransactionsQuery.ts`
- `src/hooks/useIncomeTransactionsQuery.ts`
- `src/hooks/useTransferTransactionsQuery.ts`
- `src/hooks/useRecentTransactions.ts` (may need to export QUERY_KEYS)
- `src/components/forms/CreateExpenseTransactionDrawer.tsx`
- `src/components/forms/CreateIncomeTransactionDrawer.tsx`
- `src/components/forms/CreateTransferDrawer.tsx`
- `src/components/tables/expenses/ExpenseTable.tsx`
- `src/components/tables/income/IncomeTable.tsx`
- `src/components/tables/transfers/TransferTable.tsx`
- `src/components/forms/EditExpenseDrawer.tsx`
- `src/components/forms/EditIncomeDrawer.tsx`
- `src/components/forms/EditTransferDrawer.tsx`

**Watch out for:**
- `ExpenseTransaction.amount` is `string` but `TransferTransaction.amount` and `RecentTransaction.amount` are `number`. The optimistic builders must match these types exactly.
- The `formatDateForAPI` utility is already imported in the drawers. Reuse it in the optimistic builders.
- The `recentTransactions` query key is `['recentTransactions']` (flat array, no params). Its `QUERY_KEYS` is defined in `useRecentTransactions.ts` and is NOT currently exported. You will need to either export it or use the literal `['recentTransactions']` in the other hooks.
- The current `onSuccess` invalidation lists differ slightly between hooks (e.g., expenses invalidate `cards` and `expenseBreakdown`, income invalidates `incomeBreakdown`, transfers invalidate `expenseTransactions`). Preserve these exact lists when moving them to `onSettled`.
- The `setQueriesData` predicate receives the full query key. The params object is at index `[1]` of the expanded query key (since `QUERY_KEYS.expenseTransactions` is `['expenseTransactions']`, the full key is `['expenseTransactions', { skip, take, ... }]`).
- `crypto.randomUUID()` is available in all modern browsers and Next.js server/client environments.

**Verification focus:**
- Type safety -- ensure all optimistic objects match their respective TypeScript types exactly
- Rollback correctness -- test error scenarios to confirm cache is fully restored
- Toast timing -- success toast must appear BEFORE server response, error toast on rollback
- No double toasts -- removing try/catch from drawers/tables means the hook's onError is the ONLY error toast source
