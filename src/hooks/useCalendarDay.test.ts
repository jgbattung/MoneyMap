/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendarDay } from './useCalendarDay';

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
  transactions: [],
  totals: { income: 0, expense: 0, net: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCalendarDay', () => {
  it('fetches on mount when a date is provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const { result } = renderHook(() => useCalendarDay('2026-07-29'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/calendar/day?date=2026-07-29');
    expect(result.current.data).toEqual(mockResponse);
  });

  it('does not fire when date is null', async () => {
    const { result } = renderHook(() => useCalendarDay(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    const { result } = renderHook(() => useCalendarDay('2026-07-29'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch calendar day');
  });
});
