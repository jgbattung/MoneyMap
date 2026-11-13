import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./useRecentTransactions', () => ({
  RECENT_TRANSACTION_QUERY_KEYS: { recentTransactions: ['recentTransactions'] },
}));

import { usePayDivisionsQuery } from './usePayDivisionsQuery';
import { toast } from 'sonner';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, spy, wrapper };
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === '/api/pay-divisions' && !init) return { ok: true, json: async () => [] };
    return { ok: true, json: async () => ({ id: 'x' }) };
  });
});

describe('usePayDivisionsQuery', () => {
  it('fetches the divisions list', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-divisions');
    expect(result.current.payDivisions).toEqual([]);
  });

  it('recordTransfer POSTs the atomic endpoint and invalidates balances and transfers', async () => {
    const { wrapper, spy } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordTransfer({
        divisionId: 'div-1',
        itemId: 'item-1',
        amount: '100.50',
        date: '2026-06-17',
      });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/pay-divisions/div-1/items/item-1/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '100.50', date: '2026-06-17' }),
    });
    await waitFor(() => {
      const keys = invalidatedKeys(spy);
      expect(keys).toEqual(
        expect.arrayContaining([
          JSON.stringify(['payDivisions']),
          JSON.stringify(['accounts']),
          JSON.stringify(['netWorth']),
          JSON.stringify(['transfers']),
          JSON.stringify(['expenseTransactions']),
        ])
      );
    });
  });

  it('undoTransfer DELETEs the existing transfer route and invalidates the same keys', async () => {
    const { wrapper, spy } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.undoTransfer({ itemId: 'item-1', transferTransactionId: 'tr-9' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/transfer-transactions/tr-9', { method: 'DELETE' });
    await waitFor(() => {
      const keys = invalidatedKeys(spy);
      expect(keys).toEqual(
        expect.arrayContaining([
          JSON.stringify(['accounts']),
          JSON.stringify(['netWorth']),
          JSON.stringify(['transfers']),
        ])
      );
    });
  });

  it('toggleEarmark PATCHes the item and invalidates only the checklist', async () => {
    const { wrapper, spy } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    spy.mockClear();

    await act(async () => {
      await result.current.toggleEarmark({ divisionId: 'div-1', itemId: 'item-2', done: true });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/pay-divisions/div-1/items/item-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    await waitFor(() => expect(invalidatedKeys(spy)).toEqual([JSON.stringify(['payDivisions'])]));
  });

  it('shows an error toast and rejects when recording a transfer fails', async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!init) return { ok: true, json: async () => [] };
      return { ok: false, json: async () => ({ error: 'This transfer is already recorded' }) };
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.recordTransfer({ divisionId: 'd', itemId: 'i', amount: '1', date: '2026-06-17' })
      ).rejects.toThrow('already recorded');
    });
    expect(toast.error).toHaveBeenCalledWith('Failed to record transfer', expect.anything());
  });

  it('createDivision and deleteDivision hit the right URLs', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => usePayDivisionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createDivision({ planId: 'p', payAmount: '10', payDate: '2026-06-15' });
      await result.current.deleteDivision('div-1');
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-divisions', expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-divisions/div-1', { method: 'DELETE' });
  });
});
