/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  snapshotBalanceCaches,
  restoreBalanceCaches,
  applyAccountDelta,
  applyBudgetSpentDelta,
} from './optimisticBalances';

const accountsListKey = ['accounts', { includeCards: true }];
const accountsListKeyNoCards = ['accounts', { includeCards: false }];
const cardsKey = ['cards'];
const netWorthKey = ['netWorth'];
const budgetStatusTop5Key = ['budgetStatus', { all: false }];
const budgetStatusAllKey = ['budgetStatus', { all: true }];

const makeAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 'acc-1',
  name: 'BDO Savings',
  accountType: 'SAVINGS',
  currentBalance: '1000.00',
  initialBalance: '500.00',
  addToNetWorth: true,
  ...overrides,
});

const makeCard = (overrides: Record<string, unknown> = {}) => ({
  id: 'card-1',
  name: 'Visa',
  accountType: 'CREDIT_CARD',
  currentBalance: '-200.00',
  initialBalance: '0',
  addToNetWorth: true,
  ...overrides,
});

const makeBudgetItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'type-1',
  name: 'Food',
  monthlyBudget: 500,
  spentAmount: 100,
  progressPercentage: 20,
  isOverBudget: false,
  ...overrides,
});

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe('applyAccountDelta', () => {
  it('applies the delta to the matching account across accounts and cards caches', () => {
    queryClient.setQueryData(accountsListKey, [makeAccount(), makeAccount({ id: 'acc-2', currentBalance: '50.00' })]);
    queryClient.setQueryData(accountsListKeyNoCards, [makeAccount()]);
    queryClient.setQueryData(cardsKey, [makeCard({ id: 'acc-1', currentBalance: '1000.00' })]);

    applyAccountDelta(queryClient, 'acc-1', -150);

    const withCards = queryClient.getQueryData<any>(accountsListKey);
    const noCards = queryClient.getQueryData<any>(accountsListKeyNoCards);
    const cards = queryClient.getQueryData<any>(cardsKey);

    expect(withCards[0].currentBalance).toBe('850.00');
    expect(withCards[1].currentBalance).toBe('50.00'); // other account untouched
    expect(noCards[0].currentBalance).toBe('850.00');
    expect(cards[0].currentBalance).toBe('850.00');
  });

  it('patches single-account detail caches too', () => {
    queryClient.setQueryData(['accounts', 'acc-1'], makeAccount());

    applyAccountDelta(queryClient, 'acc-1', 25.5);

    const detail = queryClient.getQueryData<any>(['accounts', 'acc-1']);
    expect(detail.currentBalance).toBe('1025.50');
  });

  it('serializes balances back to 2-decimal strings (no float artifacts)', () => {
    queryClient.setQueryData(accountsListKey, [makeAccount({ currentBalance: '0.10' })]);

    applyAccountDelta(queryClient, 'acc-1', 0.2);

    const cached = queryClient.getQueryData<any>(accountsListKey);
    expect(cached[0].currentBalance).toBe('0.30');
  });

  it('adjusts netWorth.currentNetWorth by the delta when addToNetWorth is true', () => {
    queryClient.setQueryData(accountsListKey, [makeAccount({ addToNetWorth: true })]);
    queryClient.setQueryData(netWorthKey, {
      currentNetWorth: 5000,
      monthlyChange: { amount: 120, percentage: 2.4 },
    });

    applyAccountDelta(queryClient, 'acc-1', -100);

    const netWorth = queryClient.getQueryData<any>(netWorthKey);
    expect(netWorth.currentNetWorth).toBe(4900);
    // Option A: monthlyChange intentionally untouched
    expect(netWorth.monthlyChange).toEqual({ amount: 120, percentage: 2.4 });
  });

  it('does NOT adjust netWorth when addToNetWorth is false', () => {
    queryClient.setQueryData(accountsListKey, [makeAccount({ addToNetWorth: false })]);
    queryClient.setQueryData(netWorthKey, {
      currentNetWorth: 5000,
      monthlyChange: { amount: 0, percentage: 0 },
    });

    applyAccountDelta(queryClient, 'acc-1', -100);

    const netWorth = queryClient.getQueryData<any>(netWorthKey);
    expect(netWorth.currentNetWorth).toBe(5000);
    // Account balance itself still moves
    const accounts = queryClient.getQueryData<any>(accountsListKey);
    expect(accounts[0].currentBalance).toBe('900.00');
  });

  it('does NOT adjust netWorth when the account is not found in any cache', () => {
    queryClient.setQueryData(netWorthKey, {
      currentNetWorth: 5000,
      monthlyChange: { amount: 0, percentage: 0 },
    });

    applyAccountDelta(queryClient, 'unknown-acc', -100);

    const netWorth = queryClient.getQueryData<any>(netWorthKey);
    expect(netWorth.currentNetWorth).toBe(5000);
  });

  it('finds addToNetWorth from the cards cache when the account only exists there', () => {
    queryClient.setQueryData(cardsKey, [makeCard({ addToNetWorth: true })]);
    queryClient.setQueryData(netWorthKey, {
      currentNetWorth: 5000,
      monthlyChange: { amount: 0, percentage: 0 },
    });

    applyAccountDelta(queryClient, 'card-1', -75);

    expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(4925);
    expect(queryClient.getQueryData<any>(cardsKey)[0].currentBalance).toBe('-275.00');
  });

  it('is a silent no-op on unpopulated caches', () => {
    expect(() => applyAccountDelta(queryClient, 'acc-1', -100)).not.toThrow();
    expect(queryClient.getQueryData(accountsListKey)).toBeUndefined();
    expect(queryClient.getQueryData(netWorthKey)).toBeUndefined();
  });

  it('is a no-op for a zero delta', () => {
    const accounts = [makeAccount()];
    queryClient.setQueryData(accountsListKey, accounts);

    applyAccountDelta(queryClient, 'acc-1', 0);

    expect(queryClient.getQueryData<any>(accountsListKey)[0].currentBalance).toBe('1000.00');
  });
});

describe('applyBudgetSpentDelta', () => {
  const currentMonthDate = new Date().toISOString();

  it('adjusts spentAmount and recomputes progressPercentage/isOverBudget in every budgetStatus cache', () => {
    queryClient.setQueryData(budgetStatusTop5Key, [makeBudgetItem()]);
    queryClient.setQueryData(budgetStatusAllKey, [makeBudgetItem(), makeBudgetItem({ id: 'type-2', name: 'Transport' })]);

    applyBudgetSpentDelta(queryClient, 'type-1', 450, currentMonthDate);

    const top5 = queryClient.getQueryData<any>(budgetStatusTop5Key);
    const all = queryClient.getQueryData<any>(budgetStatusAllKey);

    expect(top5[0].spentAmount).toBe(550);
    expect(top5[0].progressPercentage).toBe(110);
    expect(top5[0].isOverBudget).toBe(true);
    expect(all[0].spentAmount).toBe(550);
    expect(all[1].spentAmount).toBe(100); // other type untouched
  });

  it('handles negative deltas (delete reverses the spend)', () => {
    queryClient.setQueryData(budgetStatusAllKey, [makeBudgetItem({ spentAmount: 550, progressPercentage: 110, isOverBudget: true })]);

    applyBudgetSpentDelta(queryClient, 'type-1', -450, currentMonthDate);

    const all = queryClient.getQueryData<any>(budgetStatusAllKey);
    expect(all[0].spentAmount).toBe(100);
    expect(all[0].progressPercentage).toBe(20);
    expect(all[0].isOverBudget).toBe(false);
  });

  it('keeps progressPercentage 0 for items without a monthlyBudget', () => {
    queryClient.setQueryData(budgetStatusAllKey, [makeBudgetItem({ monthlyBudget: null, progressPercentage: 0 })]);

    applyBudgetSpentDelta(queryClient, 'type-1', 50, currentMonthDate);

    const all = queryClient.getQueryData<any>(budgetStatusAllKey);
    expect(all[0].spentAmount).toBe(150);
    expect(all[0].progressPercentage).toBe(0);
    expect(all[0].isOverBudget).toBe(false);
  });

  it('skips the delta entirely for out-of-month dates', () => {
    queryClient.setQueryData(budgetStatusAllKey, [makeBudgetItem()]);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1, 15);

    applyBudgetSpentDelta(queryClient, 'type-1', 450, lastMonth.toISOString());

    expect(queryClient.getQueryData<any>(budgetStatusAllKey)[0].spentAmount).toBe(100);
  });

  it('skips invalid dates and unpopulated caches without throwing', () => {
    expect(() => applyBudgetSpentDelta(queryClient, 'type-1', 10, 'not-a-date')).not.toThrow();
    expect(() => applyBudgetSpentDelta(queryClient, 'type-1', 10, currentMonthDate)).not.toThrow();
    expect(queryClient.getQueryData(budgetStatusAllKey)).toBeUndefined();
  });
});

describe('snapshotBalanceCaches / restoreBalanceCaches', () => {
  it('round-trips all four cache families exactly', () => {
    const accounts = [makeAccount()];
    const cards = [makeCard()];
    const netWorth = { currentNetWorth: 5000, monthlyChange: { amount: 100, percentage: 2 } };
    const budgets = [makeBudgetItem()];

    queryClient.setQueryData(accountsListKey, accounts);
    queryClient.setQueryData(cardsKey, cards);
    queryClient.setQueryData(netWorthKey, netWorth);
    queryClient.setQueryData(budgetStatusAllKey, budgets);

    const snapshot = snapshotBalanceCaches(queryClient);

    // Mutate everything optimistically
    applyAccountDelta(queryClient, 'acc-1', -300);
    applyAccountDelta(queryClient, 'card-1', 50);
    applyBudgetSpentDelta(queryClient, 'type-1', 300, new Date().toISOString());

    expect(queryClient.getQueryData<any>(accountsListKey)[0].currentBalance).toBe('700.00');

    restoreBalanceCaches(queryClient, snapshot);

    expect(queryClient.getQueryData(accountsListKey)).toEqual(accounts);
    expect(queryClient.getQueryData(cardsKey)).toEqual(cards);
    expect(queryClient.getQueryData(netWorthKey)).toEqual(netWorth);
    expect(queryClient.getQueryData(budgetStatusAllKey)).toEqual(budgets);
  });

  it('excludes undefined cache entries from the snapshot', () => {
    queryClient.setQueryData(accountsListKey, [makeAccount()]);
    // ['cards'], ['netWorth'], ['budgetStatus'] not populated

    const snapshot = snapshotBalanceCaches(queryClient);

    expect(snapshot).toHaveLength(1);
    expect(snapshot.every(([, data]) => data !== undefined)).toBe(true);
  });

  it('restore tolerates an undefined snapshot (no context)', () => {
    expect(() => restoreBalanceCaches(queryClient, undefined)).not.toThrow();
  });
});
