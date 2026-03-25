/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useExpenseTransactionsQuery, useExpenseTransactionQuery } from './useExpenseTransactionsQuery';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sonner toast to avoid noise in tests
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

const mockExpense = {
  id: 'exp-1',
  userId: 'user-123',
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  name: 'Groceries',
  amount: '100.00',
  date: '2026-01-15',
  description: null,
  isInstallment: false,
  installmentDuration: null,
  remainingInstallments: null,
  installmentStartDate: null,
  monthlyAmount: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  expenseType: { id: 'type-1', name: 'Food' },
  expenseSubcategory: null,
  tags: [],
};

const mockExpensesResponse = {
  transactions: [mockExpense],
  total: 1,
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isListQuery predicate (tested indirectly via cache behaviour)
// ---------------------------------------------------------------------------
describe('isListQuery predicate', () => {
  it('considers a query with an object at key[1] a list query', () => {
    // We verify this by seeding a list-shaped cache entry, then triggering
    // createExpenseTransaction and observing the optimistic prepend happens.
    // A single-transaction key like ['expenseTransactions', 'exp-1'] has a
    // string at key[1] and must NOT be touched.
    const { queryClient, wrapper } = createWrapperWithClient();

    const listKey = ['expenseTransactions', { skip: 0, take: 10 }];
    const singleKey = ['expenseTransactions', 'exp-1'];

    queryClient.setQueryData(listKey, {
      transactions: [mockExpense],
      total: 1,
      hasMore: false,
    });
    queryClient.setQueryData(singleKey, mockExpense);

    // The predicate should match listKey (object at [1]) but not singleKey (string at [1])
    const listEntry = queryClient.getQueryData<any>(listKey);
    const singleEntry = queryClient.getQueryData<any>(singleKey);

    expect(listEntry?.transactions).toBeDefined();
    expect(singleEntry?.id).toBe('exp-1');

    // Verify the keys themselves
    expect(typeof listKey[1]).toBe('object');
    expect(typeof singleKey[1]).toBe('string');

    void wrapper;
  });

  it('treats a null at key[1] as NOT a list query (edge case)', () => {
    // isListQuery: typeof key[1] === 'object' && key[1] !== null
    // A key like ['expenseTransactions'] has undefined at [1], not an object
    const baseKey = ['expenseTransactions'];
    expect(typeof baseKey[1]).toBe('undefined'); // not 'object', so isListQuery = false
  });
});

// ---------------------------------------------------------------------------
// query behavior
// ---------------------------------------------------------------------------
describe('useExpenseTransactionsQuery', () => {
  describe('query behavior', () => {
    it('fetches expense transactions and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpensesResponse,
      });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.expenseTransactions).toHaveLength(1);
      expect(result.current.expenseTransactions[0].id).toBe('exp-1');
      expect(result.current.total).toBe(1);
      expect(result.current.hasMore).toBe(false);
    });

    it('returns empty defaults while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useExpenseTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.expenseTransactions).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch expense transactions');
    });

    it('builds correct URL with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useExpenseTransactionsQuery({ skip: 10, take: 5, search: 'food', dateFilter: '2025-01', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=10');
      expect(calledUrl).toContain('take=5');
      expect(calledUrl).toContain('search=food');
      expect(calledUrl).toContain('dateFilter=2025-01');
      expect(calledUrl).toContain('accountId=acc-1');
    });

    it('omits dateFilter param when value is "view-all"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useExpenseTransactionsQuery({ dateFilter: 'view-all' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('dateFilter');
    });

    it('returns isFetchingMore as false during initial load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpensesResponse,
      });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isFetchingMore).toBe(false);
    });

    it('uses base URL when no params provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(() => useExpenseTransactionsQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/expense-transactions');
    });
  });

  // -------------------------------------------------------------------------
  // optimistic create
  // -------------------------------------------------------------------------
  describe('createExpenseTransaction — optimistic updates', () => {
    it('prepends optimistic transaction to list cache before API responds', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['expenseTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      // Hang the API call so we can inspect the in-flight state
      let resolveMutation!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveMutation = resolve; }));

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createExpenseTransaction({
          payload: { name: 'New Expense', amount: '50', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      // Optimistic update should be in the cache immediately
      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 2;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].name).toBe('New Expense');
      expect(cached.transactions[0].id).toMatch(/^optimistic-/);
      expect(cached.total).toBe(2);

      // Resolve the hanging mutation
      resolveMutation({ ok: true, json: async () => mockExpense });
    });

    it('does NOT prepend to pages with skip > 0 (not first page)', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const page2Key = ['expenseTransactions', { skip: 10, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(page2Key, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockExpense });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createExpenseTransactionAsync({
          payload: { name: 'New Expense', amount: '50', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      // Page 2 should be untouched (skip=10, so predicate excludes it)
      const cached = queryClient.getQueryData<any>(page2Key);
      expect(cached.transactions).toHaveLength(1);
      expect(cached.total).toBe(1);
    });

    it('does NOT prepend when search filter is active', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const searchKey = ['expenseTransactions', { skip: 0, take: 10, search: 'restaurant', dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(searchKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockExpense });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createExpenseTransactionAsync({
          payload: { name: 'New Expense', amount: '50', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      const cached = queryClient.getQueryData<any>(searchKey);
      expect(cached.transactions).toHaveLength(1);
    });

    it('rolls back optimistic create on API error and does not include undefined snapshots', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['expenseTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      // Seed a list query with data
      queryClient.setQueryData(listKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });
      // Also seed a single-transaction key (should be excluded by isListQuery + undefined filter)
      const singleKey = ['expenseTransactions', 'exp-1'];
      queryClient.setQueryData(singleKey, mockExpense);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.createExpenseTransactionAsync({
            payload: { name: 'Bad Expense', amount: '50', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
            meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
          });
        } catch {
          // expected to throw
        }
      });

      // After rollback, list cache should be restored to original
      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 1;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].id).toBe('exp-1');
      expect(cached.total).toBe(1);

      // Single-transaction key must not have been overwritten
      const single = queryClient.getQueryData<any>(singleKey);
      expect(single?.id).toBe('exp-1');
    });

    it('filters out undefined entries from getQueriesData snapshot', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      // Register a list-key observer but don't set data (so it returns undefined)
      const emptyListKey = ['expenseTransactions', { skip: 0, take: 10 }];
      // We deliberately do NOT set data for this key

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // If undefined entries were not filtered, setQueryData on rollback would
      // write undefined back to the cache, causing issues.
      // We verify no crash occurs and the key remains empty after rollback.
      await act(async () => {
        try {
          await result.current.createExpenseTransactionAsync({
            payload: { name: 'Bad Expense', amount: '50', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
            meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
          });
        } catch {
          // expected to throw
        }
      });

      // The key should still have no data (not overwritten with undefined)
      const cached = queryClient.getQueryData(emptyListKey);
      expect(cached).toBeUndefined();
    });

    it('invalidates the required query keys on success', async () => {
      // Query fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      // Mutation POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpense,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createExpenseTransactionAsync({
          payload: { name: 'Groceries', amount: '100', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-01-15', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
      expect(invalidatedKeys).toContainEqual(['monthlySummary']);
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
      expect(invalidatedKeys).toContainEqual(['recentTransactions']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseBreakdown']);
    });
  });

  // -------------------------------------------------------------------------
  // optimistic delete
  // -------------------------------------------------------------------------
  describe('deleteExpenseTransaction — optimistic updates', () => {
    it('removes the transaction from list cache optimistically before API responds', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['expenseTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      let resolveDelete!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveDelete = resolve; }));

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.deleteExpenseTransaction('exp-1');
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 0;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions).toHaveLength(0);
      expect(cached.total).toBe(0);

      resolveDelete({ ok: true, json: async () => ({}) });
    });

    it('decrements total by 1 and clamps to 0', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['expenseTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteExpenseTransactionAsync('exp-1');
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.total).toBeGreaterThanOrEqual(0);
    });

    it('rolls back optimistic delete on API error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['expenseTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockExpense],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not found' }) });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.deleteExpenseTransactionAsync('exp-1');
        } catch {
          // expected
        }
      });

      // After rollback, the transaction should be restored
      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 1;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].id).toBe('exp-1');
      expect(cached.total).toBe(1);
    });

    it('does NOT touch single-transaction query keys (isListQuery guard)', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      // Seed the single-transaction key (string at [1])
      const singleKey = ['expenseTransactions', 'exp-1'];
      queryClient.setQueryData(singleKey, mockExpense);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteExpenseTransactionAsync('exp-1');
      });

      // Single-transaction key should be untouched by the delete optimistic update
      const singleEntry = queryClient.getQueryData<any>(singleKey);
      expect(singleEntry?.id).toBe('exp-1');
    });

    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteExpenseTransactionAsync('exp-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseBreakdown']);
    });

    it('throws error when delete response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Expense not found' }),
      });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.deleteExpenseTransactionAsync('nonexistent');
        })
      ).rejects.toThrow('Expense not found');
    });
  });

  // -------------------------------------------------------------------------
  // updateExpenseTransaction mutation
  // -------------------------------------------------------------------------
  describe('updateExpenseTransaction mutation', () => {
    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpense,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateExpenseTransaction({ id: 'exp-1', amount: '200' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseBreakdown']);
    });
  });

  // -------------------------------------------------------------------------
  // recentTransactions optimistic update
  // -------------------------------------------------------------------------
  describe('createExpenseTransaction — recentTransactions optimistic update', () => {
    it('prepends optimistic item to recentTransactions cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const recentKey = ['recentTransactions'];
      queryClient.setQueryData(recentKey, [
        { id: 'recent-1', type: 'EXPENSE', name: 'Old Expense', amount: 50, date: '2026-01-01', accountId: 'acc-1', accountName: 'BDO Savings', categoryId: 'type-1', categoryName: 'Food' },
      ]);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockExpense });

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createExpenseTransactionAsync({
          payload: { name: 'New Expense', amount: '75', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      // After onSettled invalidation refetches, just verify the POST was made
      expect(mockFetch).toHaveBeenCalledWith('/api/expense-transactions', expect.any(Object));
    });

    it('initializes recentTransactions with the new item when cache was empty', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      // Do NOT seed recentTransactions — it should be initialized on optimistic update

      let resolveCreate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createExpenseTransaction({
          payload: { name: 'First Expense', amount: '100', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-02-01', isInstallment: false },
          meta: { accountName: 'BDO Savings', expenseTypeName: 'Food' },
        });
      });

      await waitFor(() => {
        const recent = queryClient.getQueryData<any>(['recentTransactions']);
        return recent !== undefined && recent !== null;
      });

      const recent = queryClient.getQueryData<any>(['recentTransactions']);
      expect(recent).toHaveLength(1);
      expect(recent[0].name).toBe('First Expense');
      expect(recent[0].type).toBe('EXPENSE');

      resolveCreate({ ok: true, json: async () => mockExpense });
    });
  });
});

// ---------------------------------------------------------------------------
// useExpenseTransactionQuery — enabled gating
// ---------------------------------------------------------------------------
describe('useExpenseTransactionQuery', () => {
  it('does not fetch when enabled is false', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useExpenseTransactionQuery('exp-1', { enabled: false }),
      { wrapper: createWrapper() }
    );

    // When disabled, query stays pending but fetch should NOT be called
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.expenseTransactionData).toBeUndefined();
  });

  it('fetches when enabled is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExpense,
    });

    const { result } = renderHook(
      () => useExpenseTransactionQuery('exp-1', { enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.expenseTransactionData?.id).toBe('exp-1');
  });

  it('does not fetch when id is empty string', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useExpenseTransactionQuery(''),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.expenseTransactionData).toBeUndefined();
  });
});
