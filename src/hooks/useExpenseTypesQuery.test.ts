/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useExpenseTypesQuery } from './useExpenseTypesQuery';

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

const mockExpenseType = {
  id: 'budget-1',
  name: 'Food',
  monthlyBudget: '500',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useExpenseTypesQuery', () => {
  describe('query behavior', () => {
    it('fetches budgets and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockExpenseType],
      });

      const { result } = renderHook(() => useExpenseTypesQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.budgets).toHaveLength(1);
      expect(result.current.budgets[0].id).toBe('budget-1');
    });

    it('returns empty array before data loads', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useExpenseTypesQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.budgets).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useExpenseTypesQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch budgets');
    });
  });

  describe('createBudget mutation', () => {
    it('invalidates budgets and budgetStatus on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpenseType,
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createBudget({ name: 'Transport', monthlyBudget: '200' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      // Existing invalidation
      expect(invalidatedKeys).toContainEqual(['budgets']);
      // Newly added invalidation
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
    });
  });

  describe('updateBudget mutation', () => {
    it('invalidates budgets and budgetStatus on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockExpenseType],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockExpenseType, monthlyBudget: '600' }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateBudget({ id: 'budget-1', monthlyBudget: '600' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      // Existing invalidation
      expect(invalidatedKeys).toContainEqual(['budgets']);
      // Newly added invalidation
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
    });

    it('optimistically updates monthlyBudget/name and recomputes progress in both budgetStatus variants', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const top5Key = ['budgetStatus', { all: false }];
      const allKey = ['budgetStatus', { all: true }];
      const item = { id: 'budget-1', name: 'Food', monthlyBudget: 500, spentAmount: 450, progressPercentage: 90, isOverBudget: false };
      queryClient.setQueryData(top5Key, [item]);
      queryClient.setQueryData(allKey, [item, { id: 'budget-2', name: 'Transport', monthlyBudget: 100, spentAmount: 10, progressPercentage: 10, isOverBudget: false }]);
      queryClient.setQueryData(['budgets'], [mockExpenseType]);

      // ['budgets'] is pre-seeded and fresh, so no fetch happens on mount:
      // the first mock is consumed by the PATCH. Keep it hanging so the
      // optimistic state can be asserted, with a generic fallback for the
      // post-success invalidation refetches.
      let resolveUpdate!: (v: unknown) => void;
      mockFetch
        .mockImplementationOnce(() => new Promise((resolve) => { resolveUpdate = resolve; }))
        .mockResolvedValue({ ok: true, json: async () => [] });

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        // 500 -> 300 budget with spent 450: 150% progress, over budget
        result.current.updateBudget({ id: 'budget-1', name: 'Groceries', monthlyBudget: '300' }).catch(() => {});
      });

      await waitFor(() => {
        const top5 = queryClient.getQueryData<any>(top5Key);
        expect(top5[0].monthlyBudget).toBe(300);
      });

      const top5 = queryClient.getQueryData<any>(top5Key);
      expect(top5[0].name).toBe('Groceries');
      expect(top5[0].progressPercentage).toBe(150);
      expect(top5[0].isOverBudget).toBe(true);
      expect(top5[0].spentAmount).toBe(450); // untouched

      const all = queryClient.getQueryData<any>(allKey);
      expect(all[0].name).toBe('Groceries');
      expect(all[0].monthlyBudget).toBe(300);
      expect(all[0].isOverBudget).toBe(true);
      expect(all[1].name).toBe('Transport'); // other item untouched

      const budgets = queryClient.getQueryData<any>(['budgets']);
      expect(budgets[0].name).toBe('Groceries');
      expect(budgets[0].monthlyBudget).toBe('300');

      resolveUpdate({ ok: true, json: async () => ({ ...mockExpenseType, name: 'Groceries', monthlyBudget: '300' }) });
    });

    it('clears the budget (null) and rolls back on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const allKey = ['budgetStatus', { all: true }];
      const item = { id: 'budget-1', name: 'Food', monthlyBudget: 500, spentAmount: 450, progressPercentage: 90, isOverBudget: false };
      queryClient.setQueryData(allKey, [item]);
      queryClient.setQueryData(['budgets'], [mockExpenseType]);

      // ['budgets'] is pre-seeded and fresh, so no fetch happens on mount:
      // the first mock is consumed by the PATCH and fails it.
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Server Error' }) })
        .mockResolvedValue({ ok: true, json: async () => [] });

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.updateBudget({ id: 'budget-1', monthlyBudget: null });
        } catch {
          // expected
        }
      });

      // Rolled back to the original values
      const all = queryClient.getQueryData<any>(allKey);
      expect(all[0].monthlyBudget).toBe(500);
      expect(all[0].progressPercentage).toBe(90);
      expect(all[0].isOverBudget).toBe(false);
      const budgets = queryClient.getQueryData<any>(['budgets']);
      expect(budgets[0].monthlyBudget).toBe('500');
    });
  });

  describe('deleteBudget mutation', () => {
    it('invalidates budgets and expenseTransactions on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockExpenseType],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Deleted', reassignedCount: 0 }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteBudget('budget-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['budgets']);
      expect(invalidatedKeys).toContainEqual(['expenseTransactions']);
    });

    it('invalidates budgetStatus on deleteBudget', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockExpenseType],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Deleted', reassignedCount: 0 }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useExpenseTypesQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteBudget('budget-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      // deleting a budget must refresh the budgets-page totals (budgetStatus)
      expect(invalidatedKeys).toContainEqual(['budgetStatus']);
    });

    it('throws error when delete response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockExpenseType],
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete default expense type' }),
      });

      const { result } = renderHook(() => useExpenseTypesQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.deleteBudget('budget-1');
        })
      ).rejects.toThrow('Cannot delete default expense type');
    });
  });

  describe('return values', () => {
    it('exposes correct loading state flags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useExpenseTypesQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
