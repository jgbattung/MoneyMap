import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendarSummary } from './useCalendarSummary';
import { useCalendarDay } from './useCalendarDay';
import { invalidateAfterTransactionWrite } from './transactionInvalidations';

/**
 * AC 10 - "creating, editing, or deleting a transaction refreshes the calendar
 * when it is on screen" - end to end.
 *
 * `transactionInvalidations.test.ts` already asserts that ['calendarSummary']
 * and ['calendarDay'] appear in EAGER_KEYS, but membership in a list is not the
 * behaviour the AC promises. What matters is that a MOUNTED observer actually
 * refires its request, which depends on the key shape lining up with what the
 * hooks register (`['calendarSummary', { start, end }]` is matched by the
 * `['calendarSummary']` prefix) and on the key landing in EAGER_KEYS rather than
 * DEFERRED_KEYS, whose `refetchType: 'none'` would leave an open calendar stale.
 * A prefix typo or a move to DEFERRED_KEYS keeps the key-list test green while
 * silently breaking the feature, so this drives a real QueryClient instead.
 */

const mockFetch = vi.fn();
global.fetch = mockFetch;

const summaryResponse = {
  days: [
    {
      date: '2026-07-29',
      expense: 100,
      income: 0,
      transfer: 0,
      expenseCount: 1,
      incomeCount: 0,
      transferCount: 0,
    },
  ],
  totals: { expense: 100, income: 0, net: -100 },
  max: { expense: 100, income: 0 },
};

const dayResponse = {
  transactions: [],
  totals: { income: 0, expense: 0, net: 0 },
};

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('calendar invalidation after a transaction write', () => {
  it('refetches a mounted useCalendarSummary observer', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => summaryResponse });
    const { queryClient, wrapper } = createHarness();

    renderHook(() => useCalendarSummary('2026-07-01', '2026-07-31'), { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    invalidateAfterTransactionWrite(queryClient, ['expenseTransactions']);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/calendar/summary?start=2026-07-01&end=2026-07-31'
    );
  });

  it('refetches a mounted useCalendarDay observer', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => dayResponse });
    const { queryClient, wrapper } = createHarness();

    renderHook(() => useCalendarDay('2026-07-29'), { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    invalidateAfterTransactionWrite(queryClient, ['expenseTransactions']);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith('/api/calendar/day?date=2026-07-29');
  });

  it('leaves the calendar queries stale but unfetched when nothing is mounted', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => summaryResponse });
    const { queryClient, wrapper } = createHarness();

    const { unmount } = renderHook(() => useCalendarSummary('2026-07-01', '2026-07-31'), {
      wrapper,
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    unmount();

    invalidateAfterTransactionWrite(queryClient, ['expenseTransactions']);

    // This is why the calendar keys can afford to be eager: with no observer
    // mounted, invalidation costs nothing but a stale mark.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryState(['calendarSummary', { start: '2026-07-01', end: '2026-07-31' }])
        ?.isInvalidated
    ).toBe(true);
  });
});
