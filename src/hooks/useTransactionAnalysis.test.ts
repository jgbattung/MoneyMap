import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTransactionAnalysis } from './useTransactionAnalysis';

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

const mockParams = { type: 'expense' as const };

const mockAnalysisResponse = {
  type: 'expense' as const,
  totalAmount: 5000,
  transactionCount: 3,
  breakdown: [
    { id: 'cat-1', name: 'Food', amount: 3000, percentage: 60 },
  ],
  transactions: [
    {
      id: 'tx-1',
      name: 'Jollibee',
      amount: 200,
      date: '2024-03-01T00:00:00Z',
      categoryName: 'Food',
      accountName: 'BPI',
    },
  ],
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTransactionAnalysis', () => {
  // -------------------------------------------------------------------------
  describe('initial state (enabled: false)', () => {
    it('returns data=null before refetch is called', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeNull();
    });

    it('returns isLoading=false initially (query is disabled)', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('returns isFetching=false initially', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('returns error=null initially', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });

    it('returns a refetch function', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns a fetchNextPage function', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.fetchNextPage).toBe('function');
    });

    it('returns isFetchingMore=false initially', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('successful fetch via refetch', () => {
    it('returns analysis data after refetch resolves', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.totalAmount).toBe(5000);
      expect(result.current.data?.transactionCount).toBe(3);
    });

    it('sets error=null on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.error).toBeNull();
    });

    it('sends type param in the query string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(
        () => useTransactionAnalysis({ type: 'income' }),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('type=income');
    });

    it('sends skip=0 and the default take=5 on the first page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=0');
      expect(calledUrl).toContain('take=5');
    });

    it('honors the initialTake option on the first page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(
        () => useTransactionAnalysis(mockParams, { initialTake: 50 }),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=0');
      expect(calledUrl).toContain('take=50');
    });

    it('sends optional filter params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const paramsWithFilters = {
        type: 'expense' as const,
        categoryId: 'cat-1',
        accountId: 'acc-1',
        search: 'jollibee',
        tagIds: ['tag-1', 'tag-2'],
      };

      const { result } = renderHook(
        () => useTransactionAnalysis(paramsWithFilters),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('categoryId=cat-1');
      expect(calledUrl).toContain('accountId=acc-1');
      expect(calledUrl).toContain('search=jollibee');
      expect(calledUrl).toContain('tagIds=tag-1%2Ctag-2');
    });
  });

  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('returns an error string when the API responds with !ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBe('Failed to fetch transaction analysis');
    });

    it('returns an error string when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
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

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.data).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('isFetchingMore derived state', () => {
    it('isFetchingMore is false when not fetching', () => {
      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('fetchNextPage — skip/append pagination', () => {
    it('fetches the next page with an advancing skip and appends transactions', async () => {
      const firstPage = {
        ...mockAnalysisResponse,
        transactionCount: 3,
        transactions: [
          { id: 'tx-1', name: 'Jollibee', amount: 200, date: '2024-03-01T00:00:00Z', categoryName: 'Food', accountName: 'BPI' },
        ],
        hasMore: true,
      };
      const secondPage = {
        ...mockAnalysisResponse,
        transactionCount: 3,
        transactions: [
          { id: 'tx-2', name: 'Grab', amount: 150, date: '2024-03-02T00:00:00Z', categoryName: 'Transport', accountName: 'GCash' },
          { id: 'tx-3', name: 'Jollibee 2', amount: 300, date: '2024-03-03T00:00:00Z', categoryName: 'Food', accountName: 'BPI' },
        ],
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => firstPage });

      const { result } = renderHook(() => useTransactionAnalysis(mockParams), {
        wrapper: createWrapper(),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data?.transactions.length).toBe(1);
      });
      expect(result.current.data?.hasMore).toBe(true);

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => secondPage });

      await result.current.fetchNextPage();

      await waitFor(() => {
        expect(result.current.data?.transactions.length).toBe(3);
      });

      // Second request should carry skip = number of transactions already loaded (1), take = 10
      const secondCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('skip=1');
      expect(secondCallUrl).toContain('take=10');

      // hasMore reflects the last page
      expect(result.current.data?.hasMore).toBe(false);

      // Summary fields still come from the first page
      expect(result.current.data?.transactionCount).toBe(3);
    });
  });
});
