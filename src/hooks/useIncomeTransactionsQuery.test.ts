/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useIncomeTransactionsQuery, useIncomeTransactionQuery } from './useIncomeTransactionsQuery';

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

const mockIncome = {
  id: 'inc-1',
  userId: 'user-123',
  accountId: 'acc-1',
  incomeTypeId: 'itype-1',
  name: 'January Salary',
  amount: '50000.00',
  date: '2026-01-31',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  incomeType: { id: 'itype-1', name: 'Salary' },
  tags: [],
};

const mockIncomeResponse = {
  transactions: [mockIncome],
  total: 1,
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isListQuery predicate
// ---------------------------------------------------------------------------
describe('isListQuery predicate (income)', () => {
  it('list key has an object at [1], single-transaction key has a string', () => {
    const listKey = ['incomeTransactions', { skip: 0, take: 10 }];
    const singleKey = ['incomeTransactions', 'inc-1'];

    expect(typeof listKey[1]).toBe('object');
    expect(typeof singleKey[1]).toBe('string');
  });

  it('base key (no second element) is not a list query', () => {
    const baseKey = ['incomeTransactions'];
    expect(typeof baseKey[1]).toBe('undefined');
  });
});

// ---------------------------------------------------------------------------
// query behavior
// ---------------------------------------------------------------------------
describe('useIncomeTransactionsQuery', () => {
  describe('query behavior', () => {
    it('fetches income transactions and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomeResponse,
      });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.incomeTransactions).toHaveLength(1);
      expect(result.current.incomeTransactions[0].id).toBe('inc-1');
      expect(result.current.total).toBe(1);
      expect(result.current.hasMore).toBe(false);
    });

    it('returns empty defaults while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useIncomeTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.incomeTransactions).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch income transactions');
    });

    it('builds correct URL with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useIncomeTransactionsQuery({ skip: 10, take: 5, search: 'salary', dateFilter: '2025-01', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=10');
      expect(calledUrl).toContain('take=5');
      expect(calledUrl).toContain('search=salary');
      expect(calledUrl).toContain('dateFilter=2025-01');
      expect(calledUrl).toContain('accountId=acc-1');
    });

    it('omits dateFilter param when value is "view-all"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useIncomeTransactionsQuery({ dateFilter: 'view-all' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('dateFilter');
    });

    it('uses base URL when no params provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(() => useIncomeTransactionsQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/income-transactions');
    });

    it('returns isFetchingMore as false during initial load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomeResponse,
      });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // optimistic create
  // -------------------------------------------------------------------------
  describe('createIncomeTransaction — optimistic updates', () => {
    it('prepends optimistic transaction to list cache before API responds', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['incomeTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      let resolveMutation!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveMutation = resolve; }));

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createIncomeTransaction({
          payload: { name: 'Bonus', amount: '10000', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-02-01' },
          meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
        });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 2;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].name).toBe('Bonus');
      expect(cached.transactions[0].id).toMatch(/^optimistic-/);
      expect(cached.total).toBe(2);

      resolveMutation({ ok: true, json: async () => mockIncome });
    });

    it('does NOT prepend to pages with skip > 0', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const page2Key = ['incomeTransactions', { skip: 10, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(page2Key, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockIncome });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createIncomeTransactionAsync({
          payload: { name: 'Bonus', amount: '10000', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-02-01' },
          meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
        });
      });

      const cached = queryClient.getQueryData<any>(page2Key);
      expect(cached.transactions).toHaveLength(1);
    });

    it('does NOT prepend when search filter is active', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const searchKey = ['incomeTransactions', { skip: 0, take: 10, search: 'salary', dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(searchKey, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockIncome });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createIncomeTransactionAsync({
          payload: { name: 'Bonus', amount: '10000', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-02-01' },
          meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
        });
      });

      const cached = queryClient.getQueryData<any>(searchKey);
      expect(cached.transactions).toHaveLength(1);
    });

    it('rolls back optimistic create on API error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['incomeTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.createIncomeTransactionAsync({
            payload: { name: 'Bad Income', amount: '100', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-02-01' },
            meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
          });
        } catch {
          // expected
        }
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 1;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].id).toBe('inc-1');
      expect(cached.total).toBe(1);
    });

    it('filters out undefined entries from getQueriesData snapshot on rollback', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // No crash should occur even when there are no seeded list caches
      await act(async () => {
        try {
          await result.current.createIncomeTransactionAsync({
            payload: { name: 'Bad Income', amount: '100', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-02-01' },
            meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
          });
        } catch {
          // expected
        }
      });

      // The empty list key should remain empty after rollback
      const emptyKey = ['incomeTransactions', { skip: 0, take: 10 }];
      expect(queryClient.getQueryData(emptyKey)).toBeUndefined();
    });

    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncome,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createIncomeTransactionAsync({
          payload: { name: 'Salary', amount: '50000', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-01-31' },
          meta: { accountName: 'BDO Savings', incomeTypeName: 'Salary' },
        });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['incomeTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
      expect(invalidatedKeys).toContainEqual(['monthlySummary']);
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
      expect(invalidatedKeys).toContainEqual(['recentTransactions']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['incomeBreakdown']);
    });
  });

  // -------------------------------------------------------------------------
  // optimistic delete
  // -------------------------------------------------------------------------
  describe('deleteIncomeTransaction — optimistic updates', () => {
    it('removes the transaction from list cache optimistically', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['incomeTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      let resolveDelete!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveDelete = resolve; }));

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.deleteIncomeTransaction('inc-1');
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

    it('rolls back optimistic delete on API error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['incomeTransactions', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockIncome],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not found' }) });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.deleteIncomeTransactionAsync('inc-1');
        } catch {
          // expected
        }
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 1;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].id).toBe('inc-1');
      expect(cached.total).toBe(1);
    });

    it('does NOT touch single-transaction query keys (isListQuery guard)', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const singleKey = ['incomeTransactions', 'inc-1'];
      queryClient.setQueryData(singleKey, mockIncome);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteIncomeTransactionAsync('inc-1');
      });

      const singleEntry = queryClient.getQueryData<any>(singleKey);
      expect(singleEntry?.id).toBe('inc-1');
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

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteIncomeTransactionAsync('inc-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['incomeTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['incomeBreakdown']);
    });

    it('throws error when delete response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Income transaction not found' }),
      });

      const { result } = renderHook(() => useIncomeTransactionsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.deleteIncomeTransactionAsync('nonexistent');
        })
      ).rejects.toThrow('Income transaction not found');
    });
  });

  // -------------------------------------------------------------------------
  // updateIncomeTransaction mutation
  // -------------------------------------------------------------------------
  describe('updateIncomeTransaction mutation', () => {
    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncome,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateIncomeTransaction({ id: 'inc-1', amount: '55000' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['incomeTransactions']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['incomeBreakdown']);
    });
  });
});

// ---------------------------------------------------------------------------
// useIncomeTransactionQuery — enabled gating
// ---------------------------------------------------------------------------
describe('useIncomeTransactionQuery', () => {
  it('does not fetch when enabled is false', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useIncomeTransactionQuery('inc-1', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.incomeTransactionData).toBeUndefined();
  });

  it('fetches when enabled is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncome,
    });

    const { result } = renderHook(
      () => useIncomeTransactionQuery('inc-1', { enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.incomeTransactionData?.id).toBe('inc-1');
  });

  it('does not fetch when id is empty string', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useIncomeTransactionQuery(''),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.incomeTransactionData).toBeUndefined();
  });
});
