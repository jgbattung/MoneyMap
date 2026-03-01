import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCardsQuery } from './useCardsQuery';

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

const mockCard = {
  id: 'card-1',
  name: 'Visa Gold',
  accountType: 'CREDIT_CARD',
  currentBalance: '-2000',
  initialBalance: '-2000',
  addToNetWorth: true,
  statementDate: 15,
  dueDate: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCardsQuery', () => {
  describe('query behavior', () => {
    it('fetches cards and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCard],
      });

      const { result } = renderHook(() => useCardsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.cards).toHaveLength(1);
      expect(result.current.cards[0].id).toBe('card-1');
    });

    it('returns empty array as default before data loads', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCardsQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.cards).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('returns error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useCardsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error).toBe('Failed to fetch accounts');
    });
  });

  describe('createCard mutation', () => {
    it('negates initialBalance before sending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCard,
      });

      const { result } = renderHook(() => useCardsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createCard({ name: 'New Card', initialBalance: '2000' });
      });

      const postCall = mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1].body);
      expect(body.initialBalance).toBe('-2000');
    });

    it('invalidates cards, accounts, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCard,
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCardsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createCard({ name: 'New Card', initialBalance: '1000' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });
  });

  describe('updateCard mutation', () => {
    it('invalidates cards, accounts, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCard],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCard, name: 'Updated Card' }),
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCardsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateCard({ id: 'card-1', name: 'Updated Card' });
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });
  });

  describe('deleteCard mutation', () => {
    it('invalidates cards, accounts, netWorth, and netWorthHistory on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCard],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => undefined, // deleteCard returns void
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCardsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteCard('card-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );

      expect(invalidatedKeys).toContainEqual(['cards']);
      expect(invalidatedKeys).toContainEqual(['accounts']);
      expect(invalidatedKeys).toContainEqual(['netWorth']);
      expect(invalidatedKeys).toContainEqual(['netWorthHistory']);
    });

    it('throws error with transactionCount when server returns it', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockCard],
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Card has transactions', transactionCount: 3 }),
      });

      const { result } = renderHook(() => useCardsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError: any;
      await act(async () => {
        try {
          await result.current.deleteCard('card-1');
        } catch (e) {
          thrownError = e;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Card has transactions');
      expect(thrownError.transactionCount).toBe(3);
    });
  });
});
