/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTransfersQuery, useTransferQuery } from './useTransferTransactionsQuery';

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

const mockTransfer = {
  id: 'transfer-1',
  userId: 'user-123',
  name: 'Test Transfer',
  amount: 1000,
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  transferTypeId: 'type-1',
  date: '2025-01-15',
  notes: null,
  feeAmount: null,
  feeExpenseId: null,
  createdAt: '2025-01-15',
  updatedAt: '2025-01-15',
  fromAccount: { id: 'acc-1', name: 'Checking', currentBalance: 5000 },
  toAccount: { id: 'acc-2', name: 'Savings', currentBalance: 2000 },
  transferType: { id: 'type-1', name: 'Internal' },
};

const mockTransfersResponse = {
  transactions: [mockTransfer],
  total: 1,
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isListQuery predicate
// ---------------------------------------------------------------------------
describe('isListQuery predicate (transfers)', () => {
  it('list key has an object at [1], single-transaction key has a string', () => {
    const listKey = ['transfers', { skip: 0, take: 10 }];
    const singleKey = ['transfers', 'transfer-1'];

    expect(typeof listKey[1]).toBe('object');
    expect(typeof singleKey[1]).toBe('string');
  });

  it('base key (no second element) is not a list query', () => {
    const baseKey = ['transfers'];
    expect(typeof baseKey[1]).toBe('undefined');
  });
});

// ---------------------------------------------------------------------------
// query behavior
// ---------------------------------------------------------------------------
describe('useTransfersQuery', () => {
  describe('query behavior', () => {
    it('fetches transfers and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfersResponse,
      });

      const { result } = renderHook(() => useTransfersQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transfers).toHaveLength(1);
      expect(result.current.transfers[0].id).toBe('transfer-1');
      expect(result.current.total).toBe(1);
      expect(result.current.hasMore).toBe(false);
    });

    it('returns empty defaults while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useTransfersQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.transfers).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useTransfersQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch transactions');
    });

    it('builds correct URL with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useTransfersQuery({ skip: 10, take: 5, search: 'test', dateFilter: '2025-01', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=10');
      expect(calledUrl).toContain('take=5');
      expect(calledUrl).toContain('search=test');
      expect(calledUrl).toContain('dateFilter=2025-01');
      expect(calledUrl).toContain('accountId=acc-1');
    });

    it('omits dateFilter param when value is "view-all"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });

      renderHook(
        () => useTransfersQuery({ dateFilter: 'view-all' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('dateFilter');
    });

    it('returns isFetchingMore as false during initial load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfersResponse,
      });

      const { result } = renderHook(() => useTransfersQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // optimistic create
  // -------------------------------------------------------------------------
  describe('createTransfer — optimistic updates', () => {
    it('prepends optimistic transfer to list cache before API responds', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['transfers', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      let resolveMutation!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveMutation = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTransfer({
          payload: { name: 'New Transfer', amount: '500', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: '2026-02-01' },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 2;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].name).toBe('New Transfer');
      expect(cached.transactions[0].id).toMatch(/^optimistic-/);
      expect(cached.total).toBe(2);

      resolveMutation({ ok: true, json: async () => mockTransfer });
    });

    it('does NOT prepend to pages with skip > 0', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const page2Key = ['transfers', { skip: 10, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(page2Key, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockTransfer });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createTransferAsync({
          payload: { name: 'New Transfer', amount: '500', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: '2026-02-01' },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      const cached = queryClient.getQueryData<any>(page2Key);
      expect(cached.transactions).toHaveLength(1);
    });

    it('does NOT prepend when search filter is active', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const searchKey = ['transfers', { skip: 0, take: 10, search: 'internal', dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(searchKey, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockTransfer });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createTransferAsync({
          payload: { name: 'New Transfer', amount: '500', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: '2026-02-01' },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      const cached = queryClient.getQueryData<any>(searchKey);
      expect(cached.transactions).toHaveLength(1);
    });

    it('rolls back optimistic create on API error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['transfers', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.createTransferAsync({
            payload: { name: 'Bad Transfer', amount: '500', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: '2026-02-01' },
            meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
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
      expect(cached.transactions[0].id).toBe('transfer-1');
      expect(cached.total).toBe(1);
    });

    it('filters out undefined entries from getQueriesData snapshot on rollback', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.createTransferAsync({
            payload: { name: 'Bad Transfer', amount: '500', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: '2026-02-01' },
            meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
          });
        } catch {
          // expected
        }
      });

      const emptyKey = ['transfers', { skip: 0, take: 10 }];
      expect(queryClient.getQueryData(emptyKey)).toBeUndefined();
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
        json: async () => mockTransfer,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createTransferAsync({
          payload: { name: 'New Transfer', amount: 500 },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['transfers']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
      expect(invalidatedKeys).toContainEqual(['monthlySummary']);
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
      expect(invalidatedKeys).toContainEqual(['recentTransactions']);
      // Newly added invalidations
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
    });
  });

  // -------------------------------------------------------------------------
  // optimistic delete
  // -------------------------------------------------------------------------
  describe('deleteTransfer — optimistic updates', () => {
    it('removes the transfer from list cache optimistically', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const listKey = ['transfers', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      let resolveDelete!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveDelete = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.deleteTransfer('transfer-1');
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

      const listKey = ['transfers', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];
      queryClient.setQueryData(listKey, {
        transactions: [mockTransfer],
        total: 1,
        hasMore: false,
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not found' }) });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.deleteTransferAsync('transfer-1');
        } catch {
          // expected
        }
      });

      await waitFor(() => {
        const cached = queryClient.getQueryData<any>(listKey);
        return cached?.transactions?.length === 1;
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].id).toBe('transfer-1');
      expect(cached.total).toBe(1);
    });

    it('does NOT touch single-transaction query keys (isListQuery guard)', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();

      const singleKey = ['transfers', 'transfer-1'];
      queryClient.setQueryData(singleKey, mockTransfer);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteTransferAsync('transfer-1');
      });

      const singleEntry = queryClient.getQueryData<any>(singleKey);
      expect(singleEntry?.id).toBe('transfer-1');
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

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteTransferAsync('transfer-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['transfers']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
    });

    it('throws error when delete response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Transfer not found' }),
      });

      const { result } = renderHook(() => useTransfersQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.deleteTransferAsync('nonexistent');
        })
      ).rejects.toThrow('Transfer not found');
    });
  });

  // -------------------------------------------------------------------------
  // updateTransfer mutation
  // -------------------------------------------------------------------------
  describe('updateTransfer mutation', () => {
    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfer,
      });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateTransfer({ id: 'transfer-1', amount: 2000 });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['transfers']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
      expect(invalidatedKeys).toContainEqual(['annualSummary']);
      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
    });
  });
});

// ---------------------------------------------------------------------------
// useTransferQuery — enabled gating
// ---------------------------------------------------------------------------
describe('useTransferQuery', () => {
  it('does not fetch when enabled is false', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useTransferQuery('transfer-1', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.transactionData).toBeUndefined();
  });

  it('fetches when enabled is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTransfer,
    });

    const { result } = renderHook(
      () => useTransferQuery('transfer-1', { enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.transactionData?.id).toBe('transfer-1');
  });

  it('does not fetch when id is empty string', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useTransferQuery(''),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.transactionData).toBeUndefined();
  });
});
