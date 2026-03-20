/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useIncomeTransactionsQuery } from './useIncomeTransactionsQuery';

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

  describe('createIncomeTransaction mutation', () => {
    it('invalidates the required query keys on success', async () => {
      // Query fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0, hasMore: false }),
      });
      // Mutation POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncome,
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createIncomeTransaction({ name: 'Salary', amount: '50000', accountId: 'acc-1', incomeTypeId: 'itype-1', date: '2026-01-31' });
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

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

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

  describe('deleteIncomeTransaction mutation', () => {
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

      const { result } = renderHook(() => useIncomeTransactionsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteIncomeTransaction('inc-1');
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
          await result.current.deleteIncomeTransaction('nonexistent');
        })
      ).rejects.toThrow('Income transaction not found');
    });
  });
});
