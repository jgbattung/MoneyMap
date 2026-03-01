/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAccountsQuery } from './useAccountsQuery';

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

const mockAccount = {
  id: 'acc-1',
  name: 'Checking',
  accountType: 'CHECKING',
  currentBalance: '5000',
  initialBalance: '5000',
  addToNetWorth: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAccountsQuery', () => {
  describe('query behavior', () => {
    it('fetches accounts and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockAccount],
      });

      const { result } = renderHook(() => useAccountsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.accounts).toHaveLength(1);
      expect(result.current.accounts[0].id).toBe('acc-1');
    });

    it('returns empty array as default before data loads', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAccountsQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.accounts).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useAccountsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch accounts');
    });

    it('uses includeCards URL param when option is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() => useAccountsQuery({ includeCards: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('includeCards=true');
    });

    it('does not include includeCards param when option is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() => useAccountsQuery({ includeCards: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('includeCards');
    });
  });

  describe('createAccount mutation', () => {
    it('invalidates accounts, cards, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccount,
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useAccountsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createAccount({ name: 'New Account', accountType: 'SAVINGS' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });
  });

  describe('updateAccount mutation', () => {
    it('invalidates accounts, cards, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockAccount],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAccount, name: 'Updated' }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useAccountsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateAccount({ id: 'acc-1', name: 'Updated' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });
  });

  describe('deleteAccount mutation', () => {
    it('invalidates accounts, cards, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockAccount],
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

      const { result } = renderHook(() => useAccountsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteAccount('acc-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });

    it('throws error with transactionCount when server returns it', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockAccount],
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Has transactions', transactionCount: 5 }),
      });

      const { result } = renderHook(() => useAccountsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError: any;
      await act(async () => {
        try {
          await result.current.deleteAccount('acc-1');
        } catch (e) {
          thrownError = e;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Has transactions');
      expect(thrownError.transactionCount).toBe(5);
    });
  });
});
