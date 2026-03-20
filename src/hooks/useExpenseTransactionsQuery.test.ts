/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useExpenseTransactionsQuery } from './useExpenseTransactionsQuery';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

  describe('createExpenseTransaction mutation', () => {
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

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createExpenseTransaction({ name: 'Groceries', amount: '100', accountId: 'acc-1', expenseTypeId: 'type-1', date: '2026-01-15', isInstallment: false });
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

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

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

  describe('deleteExpenseTransaction mutation', () => {
    it('invalidates the required query keys on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteExpenseTransaction('exp-1');
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
          await result.current.deleteExpenseTransaction('nonexistent');
        })
      ).rejects.toThrow('Expense not found');
    });
  });
});
