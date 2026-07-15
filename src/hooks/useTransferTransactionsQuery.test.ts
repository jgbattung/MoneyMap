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

  // -------------------------------------------------------------------------
  // balance / net-worth optimism (create + update + delete)
  // -------------------------------------------------------------------------
  describe('balance optimism', () => {
    const accountsKey = ['accounts', { includeCards: true }];
    const netWorthKey = ['netWorth'];
    const listKey = ['transfers', { skip: 0, take: 10, search: undefined, dateFilter: undefined, accountId: undefined }];

    function seedBalanceCaches(
      queryClient: QueryClient,
      { fromNetWorth = true, toNetWorth = true }: { fromNetWorth?: boolean; toNetWorth?: boolean } = {}
    ) {
      queryClient.setQueryData(accountsKey, [
        { id: 'acc-1', name: 'Checking', accountType: 'CHECKING', currentBalance: '5000.00', initialBalance: '0', addToNetWorth: fromNetWorth },
        { id: 'acc-2', name: 'Savings', accountType: 'SAVINGS', currentBalance: '2000.00', initialBalance: '0', addToNetWorth: toNetWorth },
        { id: 'acc-3', name: 'Cash', accountType: 'CASH', currentBalance: '300.00', initialBalance: '0', addToNetWorth: true },
      ]);
      queryClient.setQueryData(netWorthKey, {
        currentNetWorth: 7300,
        monthlyChange: { amount: 100, percentage: 2 },
      });
    }

    it('moves both balances and nets to zero on netWorth for two net-worth accounts', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);

      let resolveCreate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTransfer({
          payload: { name: 'Move funds', amount: '400', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: new Date().toISOString() },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      await waitFor(() => {
        const accounts = queryClient.getQueryData<any>(accountsKey);
        expect(accounts[0].currentBalance).toBe('4600.00');
      });
      expect(queryClient.getQueryData<any>(accountsKey)[1].currentBalance).toBe('2400.00');
      // Two addToNetWorth accounts: -400 + 400 = 0 net change
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);

      resolveCreate({ ok: true, json: async () => mockTransfer });
    });

    it('also decrements the fee from the fromAccount', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);

      let resolveCreate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTransfer({
          payload: { name: 'Move with fee', amount: '400', feeAmount: '15', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: new Date().toISOString() },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      await waitFor(() => {
        const accounts = queryClient.getQueryData<any>(accountsKey);
        // -400 transfer - 15 fee
        expect(accounts[0].currentBalance).toBe('4585.00');
      });
      expect(queryClient.getQueryData<any>(accountsKey)[1].currentBalance).toBe('2400.00');
      // Fee leaves the net worth: -15
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7285);

      resolveCreate({ ok: true, json: async () => mockTransfer });
    });

    it('changes netWorth by the signed amount when exactly one account is addToNetWorth', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient, { fromNetWorth: true, toNetWorth: false });

      let resolveCreate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTransfer({
          payload: { name: 'To external', amount: '400', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: new Date().toISOString() },
          meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
        });
      });

      await waitFor(() => {
        const accounts = queryClient.getQueryData<any>(accountsKey);
        expect(accounts[0].currentBalance).toBe('4600.00');
      });
      // Only the from-account counts toward net worth: -400
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(6900);

      resolveCreate({ ok: true, json: async () => mockTransfer });
    });

    it('restores balances and netWorth on create error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.createTransferAsync({
            payload: { name: 'Bad transfer', amount: '400', feeAmount: '15', fromAccountId: 'acc-1', toAccountId: 'acc-2', transferTypeId: 'type-1', date: new Date().toISOString() },
            meta: { fromAccountName: 'Checking', toAccountName: 'Savings', transferTypeName: 'Internal' },
          });
        } catch {
          // expected
        }
      });

      const accounts = queryClient.getQueryData<any>(accountsKey);
      expect(accounts[0].currentBalance).toBe('5000.00');
      expect(accounts[1].currentBalance).toBe('2000.00');
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);
    });

    it('reverses both balances and the fee on delete', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);
      queryClient.setQueryData(listKey, {
        transactions: [{ ...mockTransfer, amount: 400, feeAmount: 15, feeExpenseId: 'fee-1' }],
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
        const accounts = queryClient.getQueryData<any>(accountsKey);
        // +400 transfer + 15 fee refunded
        expect(accounts[0].currentBalance).toBe('5415.00');
      });
      expect(queryClient.getQueryData<any>(accountsKey)[1].currentBalance).toBe('1600.00');
      // Net worth regains only the fee: +15
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7315);

      resolveDelete({ ok: true, json: async () => ({}) });
    });

    it('deletes and reverses the fee when feeAmount is a Decimal string (server shape)', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);
      // Server rows serialize Prisma Decimals as strings.
      queryClient.setQueryData(listKey, {
        transactions: [{ ...mockTransfer, amount: 400, feeAmount: '15.00', feeExpenseId: 'fee-1' }],
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

      // The DELETE request must actually fire (a throw in onMutate would skip it)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/transfer-transactions/transfer-1', { method: 'DELETE' });
      });
      const accounts = queryClient.getQueryData<any>(accountsKey);
      // +400 transfer + 15 fee refunded
      expect(accounts[0].currentBalance).toBe('5415.00');
      expect(accounts[1].currentBalance).toBe('1600.00');
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7315);

      resolveDelete({ ok: true, json: async () => ({}) });
    });

    it('reverses old deltas and applies new ones on an account-move edit', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);
      queryClient.setQueryData(listKey, {
        transactions: [{ ...mockTransfer, amount: 400 }],
        total: 1,
        hasMore: false,
      });

      let resolveUpdate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveUpdate = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        // acc-1 -> acc-2 (400) becomes acc-1 -> acc-3 (250):
        // reverse: +400 acc-1, -400 acc-2; apply: -250 acc-1, +250 acc-3
        result.current.updateTransfer({ id: 'transfer-1', amount: '250', toAccountId: 'acc-3' }).catch(() => {});
      });

      await waitFor(() => {
        const accounts = queryClient.getQueryData<any>(accountsKey);
        expect(accounts[0].currentBalance).toBe('5150.00');
      });
      const accounts = queryClient.getQueryData<any>(accountsKey);
      expect(accounts[1].currentBalance).toBe('1600.00');
      expect(accounts[2].currentBalance).toBe('550.00');
      // All three accounts are net-worth: total unchanged
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);
      // Row patched with the number-normalized amount
      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].amount).toBe(250);
      expect(cached.transactions[0].toAccountId).toBe('acc-3');

      resolveUpdate({ ok: true, json: async () => ({ ...mockTransfer, amount: 250, toAccountId: 'acc-3' }) });
    });

    it('applies the amount difference on a same-accounts amount edit', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);
      queryClient.setQueryData(listKey, {
        transactions: [{ ...mockTransfer, amount: 400 }],
        total: 1,
        hasMore: false,
      });

      let resolveUpdate!: (v: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveUpdate = resolve; }));

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        // 400 -> 500 on same accounts: -100 from acc-1, +100 to acc-2
        result.current.updateTransfer({ id: 'transfer-1', amount: '500' }).catch(() => {});
      });

      await waitFor(() => {
        const accounts = queryClient.getQueryData<any>(accountsKey);
        expect(accounts[0].currentBalance).toBe('4900.00');
      });
      expect(queryClient.getQueryData<any>(accountsKey)[1].currentBalance).toBe('2100.00');
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);

      resolveUpdate({ ok: true, json: async () => ({ ...mockTransfer, amount: 500 }) });
    });

    it('applies no balance delta on update when the old row is not cached', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0, hasMore: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockTransfer });

      const { result } = renderHook(() => useTransfersQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateTransfer({ id: 'not-cached-id', amount: '999' });
      });

      const accounts = queryClient.getQueryData<any>(accountsKey);
      expect(accounts[0].currentBalance).toBe('5000.00');
      expect(accounts[1].currentBalance).toBe('2000.00');
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);
    });

    it('restores the row and balance caches on update error', async () => {
      const { queryClient, wrapper } = createWrapperWithClient();
      seedBalanceCaches(queryClient);
      queryClient.setQueryData(listKey, {
        transactions: [{ ...mockTransfer, amount: 400 }],
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
          await result.current.updateTransfer({ id: 'transfer-1', amount: '500' });
        } catch {
          // expected
        }
      });

      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.transactions[0].amount).toBe(400);
      const accounts = queryClient.getQueryData<any>(accountsKey);
      expect(accounts[0].currentBalance).toBe('5000.00');
      expect(accounts[1].currentBalance).toBe('2000.00');
      expect(queryClient.getQueryData<any>(netWorthKey).currentNetWorth).toBe(7300);
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
