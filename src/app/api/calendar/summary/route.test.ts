/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    expenseTransaction: {
      groupBy: vi.fn(),
    },
    incomeTransaction: {
      groupBy: vi.fn(),
    },
    transferTransaction: {
      groupBy: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/calendar/summary');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);
  vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([]);
  vi.mocked(db.transferTransaction.groupBy).mockResolvedValue([]);
});

describe('GET /api/calendar/summary', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for an inverted range', async () => {
    const response = await GET(makeRequest({ start: '2026-07-31', end: '2026-07-01' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid parameters');
  });

  it('returns 400 for a range longer than 62 days', async () => {
    const response = await GET(makeRequest({ start: '2026-01-01', end: '2026-04-01' }));

    expect(response.status).toBe(400);
  });

  it('returns 400 for a missing param', async () => {
    const response = await GET(makeRequest({ start: '2026-07-01' }));

    expect(response.status).toBe(400);
  });

  it('returns days/totals/max for a valid range with activity', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { date: new Date('2026-07-05T00:00:00.000Z'), _sum: { amount: '100.00' }, _count: 1 } as any,
    ]);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([
      { date: new Date('2026-07-01T00:00:00.000Z'), _sum: { amount: '5000.00' }, _count: 1 } as any,
    ]);
    vi.mocked(db.transferTransaction.groupBy).mockResolvedValue([
      { date: new Date('2026-07-10T00:00:00.000Z'), _sum: { amount: 250.5 }, _count: 1 } as any,
    ]);

    const response = await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.days).toHaveLength(3);
    expect(data.totals).toEqual({ expense: 100, income: 5000, net: 4900 });
    expect(data.max).toEqual({ expense: 100, income: 5000 });

    // No day whose counts are all zero.
    for (const day of data.days) {
      expect(day.expenseCount + day.incomeCount + day.transferCount).toBeGreaterThan(0);
    }
  });

  it('re-buckets a UTC-midnight row and a same-day wall-clock-timestamp row into one day', async () => {
    // Reproduces the cron-vs-form date-shape collision.
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { date: new Date('2026-07-29T00:00:00.000Z'), _sum: { amount: '100.00' }, _count: 1 } as any,
      { date: new Date('2026-07-29T00:03:11.442Z'), _sum: { amount: '50.00' }, _count: 1 } as any,
    ]);

    const response = await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));
    const data = await response.json();

    expect(data.days).toHaveLength(1);
    expect(data.days[0].date).toBe('2026-07-29');
    expect(data.days[0].expense).toBe(150);
    expect(data.days[0].expenseCount).toBe(2);
  });

  it('excludes installments by filtering isInstallment: false on the expense query', async () => {
    await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));

    expect(db.expenseTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isInstallment: false }),
      })
    );
  });

  it('scopes every query to the session userId', async () => {
    await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));

    expect(db.expenseTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-123' }) })
    );
    expect(db.incomeTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-123' }) })
    );
    expect(db.transferTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-123' }) })
    );
  });

  it('returns an empty days array with zero totals for a range with no activity', async () => {
    const response = await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.days).toEqual([]);
    expect(data.totals).toEqual({ expense: 0, income: 0, net: 0 });
    expect(data.max).toEqual({ expense: 0, income: 0 });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest({ start: '2026-07-01', end: '2026-07-31' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch calendar summary');
  });
});
