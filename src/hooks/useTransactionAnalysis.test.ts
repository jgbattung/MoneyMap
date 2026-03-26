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

    it('sends skip and take params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result } = renderHook(
        () =>
          useTransactionAnalysis({ type: 'expense', skip: 0, take: 15 }),
        { wrapper: createWrapper() }
      );

      await result.current.refetch();

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('skip=0');
      expect(calledUrl).toContain('take=15');
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

      // isFetchingMore = isFetching && isPlaceholderData
      // Neither is true at idle state
      expect(result.current.isFetchingMore).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('keepPreviousData behavior', () => {
    it('returns previous data while refetching with new params (no data flash to null)', async () => {
      // First fetch — returns data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      const { result, rerender } = renderHook(
        ({ params }) => useTransactionAnalysis(params),
        {
          wrapper: createWrapper(),
          initialProps: { params: { type: 'expense' as const, take: 5 } },
        }
      );

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      // Slow second fetch — should keep previous data visible
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => mockAnalysisResponse }), 100))
      );

      // Change params to trigger a new query key
      rerender({ params: { type: 'expense' as const, take: 15 } });

      await result.current.refetch();

      // During the fetch, data should still be the previous data (not null)
      // because keepPreviousData / placeholderData is enabled
      expect(result.current.data).not.toBeNull();
    });
  });
});
