/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendarSummary } from './useCalendarSummary';

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

const mockResponse = {
  days: [{ date: '2026-07-29', expense: 100, income: 0, transfer: 0, expenseCount: 1, incomeCount: 0, transferCount: 0 }],
  totals: { expense: 100, income: 0, net: -100 },
  max: { expense: 100, income: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCalendarSummary', () => {
  it('fetches on mount with a queryKey containing start and end', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const { result } = renderHook(() => useCalendarSummary('2026-07-01', '2026-07-31'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/calendar/summary?start=2026-07-01&end=2026-07-31');
    expect(result.current.data).toEqual(mockResponse);
  });

  it('returns an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    const { result } = renderHook(() => useCalendarSummary('2026-07-01', '2026-07-31'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch calendar summary');
  });

  it('refetches when start/end change (new query key)', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockResponse });

    const { rerender } = renderHook(
      ({ start, end }) => useCalendarSummary(start, end),
      {
        wrapper: createWrapper(),
        initialProps: { start: '2026-07-01', end: '2026-07-31' },
      }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender({ start: '2026-08-01', end: '2026-08-31' });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith('/api/calendar/summary?start=2026-08-01&end=2026-08-31');
  });
});
