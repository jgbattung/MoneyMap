import { QueryClient } from "@tanstack/react-query";
import { RECENT_TRANSACTION_QUERY_KEYS } from "./useRecentTransactions";

/**
 * Query keys that should refetch immediately after a transaction write.
 * These represent cheap, currently-visible data that users expect to update
 * instantly (account balances, budget bars, monthly summary, dashboard totals).
 */
export const EAGER_KEYS = [
  RECENT_TRANSACTION_QUERY_KEYS.recentTransactions,
  ['accounts'],
  ['cards'],
  ['monthlySummary'],
  ['budgetStatus'],
  ['netWorth'],
] as const;

/**
 * Query keys that are marked stale but NOT immediately refetched.
 * These are heavier report queries that will pick up fresh data on next
 * navigation or mount, avoiding a simultaneous waterfall of requests.
 */
export const DEFERRED_KEYS = [
  ['netWorthHistory'],
  ['annualSummary'],
  ['expenseBreakdown'],
  ['incomeBreakdown'],
] as const;

/**
 * Invalidates all standard query keys after a transaction write.
 *
 * - Eager keys are invalidated normally and refetch immediately if mounted.
 * - Deferred keys are marked stale with refetchType: 'none' so they only
 *   refetch on next mount/navigation.
 * - The hook's own list key is also invalidated eagerly.
 *
 * @param queryClient - The TanStack Query client
 * @param ownListKey - The hook's own list query key (e.g. ['expenseTransactions'])
 * @param extraEagerKeys - Additional keys to invalidate eagerly (e.g. ['expenseTransactions'] for transfers)
 */
export function invalidateAfterTransactionWrite(
  queryClient: QueryClient,
  ownListKey: readonly unknown[],
  extraEagerKeys: readonly (readonly unknown[])[] = []
): void {
  // Own list key — eager
  queryClient.invalidateQueries({ queryKey: ownListKey });

  // Standard eager keys
  for (const key of EAGER_KEYS) {
    queryClient.invalidateQueries({ queryKey: key });
  }

  // Extra eager keys (hook-specific)
  for (const key of extraEagerKeys) {
    queryClient.invalidateQueries({ queryKey: key });
  }

  // Deferred keys — mark stale but don't trigger an immediate refetch
  for (const key of DEFERRED_KEYS) {
    queryClient.invalidateQueries({ queryKey: key, refetchType: 'none' });
  }
}
