import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEventLedger, useEventLedgerTag } from './useEventLedger';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

const mockParams = { tagIds: ['tag-1', 'tag-2'] };

const mockLedgerResponse = {
  totalExpenses: 5000,
  totalIncome: 2000,
  netAmount: 3000,
  expenseCount: 3,
  incomeCount: 1,
  transactions: [
    {
      id: 'tx-1',
      name: 'Jollibee',
      amount: 200,
      type: 'expense' as const,
      date: '2024-03-01T00:00:00Z',
      categoryName: 'Food',
      accountName: 'BPI Checking',
      tags: [{ id: 'tag-1', name: 'Trip', color: '#ff0000' }],
    },
  ],
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useEventLedger
// ---------------------------------------------------------------------------

describe('useEventLedger', () => {
  describe('initial state (enabled: false)', () => {
    it('returns data=null before refetch is called', () => {
      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });
      expect(result.current.data).toBeNull();
    });

    it('returns isFetching=false initially', () => {
      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });
      expect(result.current.isFetching).toBe(false);
    });

    it('returns error=null initially', () => {
      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });
      expect(result.current.error).toBeNull();
    });

    it('returns a refetch function', () => {
      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns isFetchingMore=false initially', () => {
      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });
      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  describe('successful fetch via refetch', () => {
    it('returns ledger data after refetch resolves', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedgerResponse,
      });

      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.totalExpenses).toBe(5000);
      expect(result.current.data?.totalIncome).toBe(2000);
      expect(result.current.data?.netAmount).toBe(3000);
    });

    it('sends tagIds as comma-separated in the query string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedgerResponse,
      });

      const { result } = renderHook(
        () => useEventLedger({ tagIds: ['tag-1', 'tag-2'] }),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('tagIds=tag-1%2Ctag-2');
    });

    it('sends optional filter params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedgerResponse,
      });

      const { result } = renderHook(
        () =>
          useEventLedger({
            tagIds: ['tag-1'],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            accountId: 'acc-1',
            skip: 0,
            take: 20,
          }),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('startDate=2024-01-01');
      expect(calledUrl).toContain('endDate=2024-12-31');
      expect(calledUrl).toContain('accountId=acc-1');
      expect(calledUrl).toContain('skip=0');
      expect(calledUrl).toContain('take=20');
    });

    it('sets error=null on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLedgerResponse,
      });

      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('returns an error string when the API responds with !ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBe('Failed to fetch event ledger');
    });

    it('returns an error string when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBe('Network failure');
    });

    it('returns data=null on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useEventLedger(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.data).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// useEventLedgerTag
// ---------------------------------------------------------------------------

describe('useEventLedgerTag', () => {
  it('returns addTag function and isAdding=false initially', () => {
    const { result } = renderHook(() => useEventLedgerTag(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.addTag).toBe('function');
    expect(result.current.isAdding).toBe(false);
  });

  it('calls PATCH /api/reports/event-ledger/tag on addTag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useEventLedgerTag(), {
      wrapper: createWrapper(),
    });

    result.current.addTag({
      transactionId: 'tx-1',
      transactionType: 'expense',
      tagId: 'tag-1',
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/event-ledger/tag', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: 'tx-1',
        transactionType: 'expense',
        tagId: 'tag-1',
      }),
    });
  });
});
