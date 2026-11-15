/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    expenseTransaction: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    incomeTransaction: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    expenseType: { findMany: vi.fn() },
    expenseSubcategory: { findMany: vi.fn() },
    incomeType: { findMany: vi.fn() },
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
  const url = new URL('http://localhost/api/reports/transaction-analysis');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const dateRows = [
  { date: new Date('2026-01-10T00:00:00.000Z'), _sum: { amount: '0.10' }, _count: 1 },
  { date: new Date('2026-01-20T00:05:00.000Z'), _sum: { amount: '0.20' }, _count: 1 },
  { date: new Date('2026-03-05T00:00:00.000Z'), _sum: { amount: '100.50' }, _count: 2 },
];

function setupModel(model: 'expenseTransaction' | 'incomeTransaction', breakdownKey: string) {
  const m = db[model] as any;
  m.aggregate.mockResolvedValue({ _sum: { amount: '100.80' }, _count: 4 });
  m.findMany.mockResolvedValue([]);
  m.groupBy.mockImplementation(async (args: any) =>
    args.by[0] === 'date'
      ? dateRows
      : args.by[0] === breakdownKey
        ? [{ [breakdownKey]: 'cat-1', _sum: { amount: '100.80' } }]
        : []
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  (db.expenseType.findMany as any).mockResolvedValue([{ id: 'cat-1', name: 'Bills' }]);
  (db.expenseSubcategory.findMany as any).mockResolvedValue([]);
  (db.incomeType.findMany as any).mockResolvedValue([{ id: 'cat-1', name: 'Salary' }]);
});

describe('GET /api/reports/transaction-analysis monthly series', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const response = await GET(makeRequest({ type: 'expense' }));
    expect(response.status).toBe(401);
  });

  it('returns a zero-filled monthly series for the requested range', async () => {
    setupModel('expenseTransaction', 'expenseTypeId');
    const response = await GET(
      makeRequest({ type: 'expense', startDate: '2026-01-01', endDate: '2026-04-30' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.monthly).toEqual([
      { month: '2026-01', amount: 0.3, count: 2 },
      { month: '2026-02', amount: 0, count: 0 },
      { month: '2026-03', amount: 100.5, count: 2 },
      { month: '2026-04', amount: 0, count: 0 },
    ]);
  });

  it('passes the same where to the date groupBy as to the aggregate', async () => {
    setupModel('expenseTransaction', 'expenseTypeId');
    await GET(
      makeRequest({
        type: 'expense',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        categoryIds: 'cat-1,cat-2',
        subcategoryIds: 'sub-1,sub-2',
        tagIds: 'tag-1',
        accountId: 'acc-1',
        search: 'electric',
      })
    );

    const m = db.expenseTransaction as any;
    const aggregateWhere = m.aggregate.mock.calls[0][0].where;
    const dateCall = m.groupBy.mock.calls.find((c: any[]) => c[0].by[0] === 'date');
    expect(dateCall).toBeDefined();
    expect(dateCall[0].where).toEqual(aggregateWhere);
    expect(aggregateWhere).toMatchObject({
      userId: 'user-123',
      isInstallment: false,
      expenseTypeId: { in: ['cat-1', 'cat-2'] },
      expenseSubcategoryId: { in: ['sub-1', 'sub-2'] },
      accountId: 'acc-1',
      name: { contains: 'electric', mode: 'insensitive' },
      tags: { some: { id: { in: ['tag-1'] } } },
    });
  });

  it('monthly amounts sum to totalAmount to the centavo', async () => {
    setupModel('expenseTransaction', 'expenseTypeId');
    const response = await GET(makeRequest({ type: 'expense' }));
    const data = await response.json();

    const cents = data.monthly.reduce(
      (s: number, r: { amount: number }) => s + Math.round(r.amount * 100),
      0
    );
    expect(cents).toBe(Math.round(data.totalAmount * 100));
  });

  it('works for income', async () => {
    setupModel('incomeTransaction', 'incomeTypeId');
    const response = await GET(
      makeRequest({ type: 'income', startDate: '2026-01-01', endDate: '2026-03-31' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.monthly.map((r: any) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    const m = db.incomeTransaction as any;
    const dateCall = m.groupBy.mock.calls.find((c: any[]) => c[0].by[0] === 'date');
    expect(dateCall[0].where).toEqual(m.aggregate.mock.calls[0][0].where);
    expect(dateCall[0].where.isInstallment).toBeUndefined();
  });
});
