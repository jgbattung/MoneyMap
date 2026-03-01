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

    it('does NOT invalidate budgetStatus on deleteBudget', async () => {
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

      // budgetStatus should NOT be in delete invalidations (only in create/update)
      expect(invalidatedKeys).not.toContainEqual(['budgetStatus']);
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
