import { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Shared optimistic-balance helpers for transaction mutations.
 *
 * Sign conventions (mirror the server balance semantics):
 * - expense  = -amount on the account
 * - income   = +amount on the account
 * - transfer = -amount on fromAccount, +amount on toAccount, -fee on fromAccount
 *
 * All helpers treat unpopulated caches as silent no-ops — the eager
 * invalidations in `invalidateAfterTransactionWrite` reconcile with server
 * truth shortly after, so correctness never depends on the optimistic path.
 */

type CachedAccount = {
  id: string;
  currentBalance: string;
  addToNetWorth: boolean;
};

type NetWorthCache = {
  currentNetWorth: number;
  monthlyChange: {
    amount: number;
    percentage: number;
  };
};

type BudgetStatusItemCache = {
  id: string;
  name: string;
  monthlyBudget: number | null;
  spentAmount: number;
  progressPercentage: number;
  isOverBudget: boolean;
};

export type BalanceCacheSnapshot = Array<[QueryKey, unknown]>;

/**
 * Captures the current data of every ['accounts'], ['cards'], ['netWorth']
 * and ['budgetStatus'] cache variant so a failed mutation can roll back.
 */
export function snapshotBalanceCaches(queryClient: QueryClient): BalanceCacheSnapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: ['accounts'] }),
    ...queryClient.getQueriesData({ queryKey: ['cards'] }),
    ...queryClient.getQueriesData({ queryKey: ['netWorth'] }),
    ...queryClient.getQueriesData({ queryKey: ['budgetStatus'] }),
  ].filter(([, data]) => data !== undefined);
}

/** Writes every snapshot entry back into the cache (rollback). */
export function restoreBalanceCaches(
  queryClient: QueryClient,
  snapshot: BalanceCacheSnapshot | undefined
): void {
  snapshot?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

// Prisma Decimals serialize as strings; keep the 2-decimal string format.
const toBalanceString = (value: number): string => value.toFixed(2);

const isAccountShaped = (item: unknown, accountId: string): item is CachedAccount =>
  typeof item === 'object' &&
  item !== null &&
  (item as CachedAccount).id === accountId &&
  typeof (item as CachedAccount).currentBalance === 'string';

function patchAccountInData(data: unknown, accountId: string, delta: number): unknown {
  // Array-shaped caches: ['accounts', {includeCards}], ['cards']
  if (Array.isArray(data)) {
    let changed = false;
    const next = data.map((item) => {
      if (isAccountShaped(item, accountId)) {
        changed = true;
        return { ...item, currentBalance: toBalanceString(parseFloat(item.currentBalance) + delta) };
      }
      return item;
    });
    return changed ? next : data;
  }
  // Single-account detail caches: ['accounts', id], ['cards', id]
  if (isAccountShaped(data, accountId)) {
    return { ...data, currentBalance: toBalanceString(parseFloat(data.currentBalance) + delta) };
  }
  return data;
}

/**
 * Reads `addToNetWorth` for an account from any populated accounts/cards
 * cache. Not found -> false, so the net-worth patch becomes a no-op and the
 * eager refetch reconciles.
 */
function findAddToNetWorth(queryClient: QueryClient, accountId: string): boolean {
  const caches = [
    ...queryClient.getQueriesData({ queryKey: ['accounts'] }),
    ...queryClient.getQueriesData({ queryKey: ['cards'] }),
  ];
  for (const [, data] of caches) {
    const candidates = Array.isArray(data) ? data : [data];
    for (const item of candidates) {
      if (isAccountShaped(item, accountId) && typeof item.addToNetWorth === 'boolean') {
        return item.addToNetWorth;
      }
    }
  }
  return false;
}

/**
 * Applies a signed balance delta to the matching account in every
 * ['accounts', ...] and ['cards', ...] cache variant. When the account has
 * `addToNetWorth: true` (per the cached account data), the ['netWorth']
 * `currentNetWorth` figure is adjusted by the same delta; `monthlyChange`
 * is intentionally left untouched (Option A — it refreshes from the server).
 */
export function applyAccountDelta(queryClient: QueryClient, accountId: string, delta: number): void {
  if (delta === 0) return;

  const addToNetWorth = findAddToNetWorth(queryClient, accountId);

  queryClient.setQueriesData({ queryKey: ['accounts'] }, (old: unknown) =>
    patchAccountInData(old, accountId, delta)
  );
  queryClient.setQueriesData({ queryKey: ['cards'] }, (old: unknown) =>
    patchAccountInData(old, accountId, delta)
  );

  if (addToNetWorth) {
    queryClient.setQueryData<NetWorthCache>(['netWorth'], (old) => {
      if (!old || typeof old.currentNetWorth !== 'number') return old;
      return {
        ...old,
        currentNetWorth: Math.round((old.currentNetWorth + delta) * 100) / 100,
      };
    });
  }
}

/**
 * Adjusts `spentAmount` for the matching expense type in every
 * ['budgetStatus', ...] cache and recomputes `progressPercentage` /
 * `isOverBudget` with the same math as the budget-status route. No-op when
 * the transaction date falls outside the current month (the server's
 * groupBy is month-scoped).
 */
export function applyBudgetSpentDelta(
  queryClient: QueryClient,
  expenseTypeId: string,
  delta: number,
  txDate: string | Date
): void {
  if (delta === 0) return;

  const date = txDate instanceof Date ? txDate : new Date(txDate);
  if (Number.isNaN(date.getTime())) return;
  const now = new Date();
  if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return;

  queryClient.setQueriesData<BudgetStatusItemCache[]>({ queryKey: ['budgetStatus'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((item) => {
      if (item.id !== expenseTypeId) return item;
      const spentAmount = Math.round((item.spentAmount + delta) * 100) / 100;
      const progressPercentage = item.monthlyBudget && item.monthlyBudget > 0
        ? Math.round((spentAmount / item.monthlyBudget) * 100 * 100) / 100
        : 0;
      const isOverBudget = item.monthlyBudget ? spentAmount > item.monthlyBudget : false;
      return { ...item, spentAmount, progressPercentage, isOverBudget };
    });
  });
}
