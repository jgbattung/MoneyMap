/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeCumulativeNetWorth } from '@/lib/net-worth-history';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

describe('computeCumulativeNetWorth', () => {
  const window12 = [
    { year: 2024, month: 7 },
    { year: 2024, month: 8 },
    { year: 2024, month: 9 },
    { year: 2024, month: 10 },
    { year: 2024, month: 11 },
    { year: 2024, month: 12 },
    { year: 2025, month: 1 },
    { year: 2025, month: 2 },
    { year: 2025, month: 3 },
    { year: 2025, month: 4 },
    { year: 2025, month: 5 },
    { year: 2025, month: 6 },
  ];

  it('returns an empty array when windowMonths is empty', () => {
    const result = computeCumulativeNetWorth(1000, [], [], []);
    expect(result).toEqual([]);
  });

  it('returns initialBalance for every month when there are no transactions', () => {
    const result = computeCumulativeNetWorth(5000, [], [], window12);
    expect(result).toHaveLength(12);
    for (const entry of result) {
      expect(entry.netWorth).toBe(5000);
    }
  });

  it('accumulates income and expenses correctly across months', () => {
    const incomeRows = [
      { year: 2024, month: 7, total: 1000 },
      { year: 2024, month: 8, total: 2000 },
    ];
    const expenseRows = [
      { year: 2024, month: 7, total: 500 },
      { year: 2024, month: 9, total: 300 },
    ];

    const result = computeCumulativeNetWorth(0, incomeRows, expenseRows, window12);

    // July 2024: 0 + 1000 - 500 = 500
    expect(result[0].netWorth).toBe(500);
    // Aug 2024: 0 + (1000+2000) - 500 = 2500
    expect(result[1].netWorth).toBe(2500);
    // Sep 2024: 0 + 3000 - (500+300) = 2200
    expect(result[2].netWorth).toBe(2200);
    // Oct..Dec should be same as Sep (no new rows)
    expect(result[3].netWorth).toBe(2200);
  });

  it('includes rows from before the window in cumulative sum', () => {
    // Row from 2023 is before the window but must still be included
    const incomeRows = [{ year: 2023, month: 1, total: 10000 }];
    const result = computeCumulativeNetWorth(0, incomeRows, [], [{ year: 2025, month: 1 }]);
    expect(result[0].netWorth).toBe(10000);
  });

  it('rounds to 2 decimal places', () => {
    const incomeRows = [{ year: 2025, month: 1, total: 0.1 }];
    const expenseRows = [{ year: 2025, month: 1, total: 0.2 }];
    const result = computeCumulativeNetWorth(0, incomeRows, expenseRows, [{ year: 2025, month: 1 }]);
    expect(result[0].netWorth).toBe(Math.round((0.1 - 0.2) * 100) / 100);
  });

  it('produces correct month labels', () => {
    const result = computeCumulativeNetWorth(0, [], [], [{ year: 2025, month: 6 }]);
    expect(result[0].month).toBe('Jun 2025');
  });
});

describe('GET /api/net-worth/history — leading-month window (Phase 2 off-by-one fix)', () => {
  beforeEach(() => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      { id: 'acc-1', initialBalance: '100000' },
    ] as any);
  });

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const response = await GET({} as any);
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('Unauthorized');
  });

  it('returns an empty history when no net-worth accounts exist', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([] as any);
    const response = await GET({} as any);
    expect(response.status).toBe(200);
    expect((await response.json()).history).toEqual([]);
  });

  it('opens the window one month BEFORE the earliest data month with the true opening balance', async () => {
    // Earliest transaction month is Jan 2026. The fix must prepend a Dec 2025
    // leading point that has zero flows and therefore equals the summed
    // initialBalance exactly. A revert of the `- 1` would make Jan 2026 the
    // first entry and fold January's flows into the baseline.
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([{ year: 2026, month: 1, total: 5000 }] as any) // income
      .mockResolvedValueOnce([{ year: 2026, month: 1, total: 2000 }] as any); // expense

    const response = await GET({} as any);
    const { history } = await response.json();

    // Leading entry is the month before the earliest data month.
    expect(history[0].month).toBe('Dec 2025');
    // Zero flows in that leading month => exactly the summed initialBalance.
    expect(history[0].netWorth).toBe(100000);
    // The next entry (Jan 2026) carries January's net flow (+5000 - 2000).
    expect(history[1].month).toBe('Jan 2026');
    expect(history[1].netWorth).toBe(103000);
  });

  it('returns 500 when a query throws', async () => {
    vi.mocked(db.financialAccount.findMany).mockRejectedValue(new Error('DB error'));
    const response = await GET({} as any);
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Failed to fetch net worth history');
  });
});
