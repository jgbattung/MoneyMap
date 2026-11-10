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
    expenseTransaction: { aggregate: vi.fn(), findMany: vi.fn() },
    incomeTransaction: { aggregate: vi.fn(), findMany: vi.fn() },
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const session = { user: { id: 'user-123' }, session: { id: 's' } };

function req(query: string) {
  return new NextRequest(`http://localhost/api/reports/event-ledger?${query}`);
}

function expenseRow(id: string, date: string, amount = '100.00') {
  return {
    id,
    name: `exp-${id}`,
    amount,
    date: new Date(date),
    account: { name: 'Cash' },
    expenseType: { name: 'Food' },
    expenseSubcategory: null,
    tags: [],
  };
}

function incomeRow(id: string, date: string, amount = '50.00') {
  return {
    id,
    name: `inc-${id}`,
    amount,
    date: new Date(date),
    account: { name: 'Cash' },
    incomeType: { name: 'Salary' },
    tags: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth.api.getSession as any).mockResolvedValue(session);
  (db.expenseTransaction.aggregate as any).mockResolvedValue({ _sum: { amount: null }, _count: 0 });
  (db.incomeTransaction.aggregate as any).mockResolvedValue({ _sum: { amount: null }, _count: 0 });
  (db.expenseTransaction.findMany as any).mockResolvedValue([]);
  (db.incomeTransaction.findMany as any).mockResolvedValue([]);
});

describe('GET /api/reports/event-ledger', () => {
  it('returns 401 without a session', async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const res = await GET(req('tagIds=t1'));
    expect(res.status).toBe(401);
  });

  it('tags-only builds the tags.some where and no date', async () => {
    const res = await GET(req('tagIds=t1,t2'));
    expect(res.status).toBe(200);
    expect((db.expenseTransaction.aggregate as any).mock.calls[0][0].where).toEqual({
      userId: 'user-123',
      tags: { some: { id: { in: ['t1', 't2'] } } },
      isInstallment: false,
    });
    expect((db.incomeTransaction.aggregate as any).mock.calls[0][0].where).toEqual({
      userId: 'user-123',
      tags: { some: { id: { in: ['t1', 't2'] } } },
    });
  });

  it('range-only builds UTC date bounds with no tags key', async () => {
    const res = await GET(req('startDate=2026-11-03&endDate=2026-11-09'));
    expect(res.status).toBe(200);
    const where = (db.incomeTransaction.findMany as any).mock.calls[0][0].where;
    expect(where).toEqual({
      userId: 'user-123',
      date: {
        gte: new Date('2026-11-03T00:00:00.000Z'),
        lt: new Date('2026-11-10T00:00:00.000Z'),
      },
    });
    expect(where).not.toHaveProperty('tags');
  });

  it('range + account adds accountId to both wheres', async () => {
    await GET(req('startDate=2026-11-03&endDate=2026-11-09&accountId=acc-1'));
    expect((db.expenseTransaction.findMany as any).mock.calls[0][0].where).toMatchObject({
      accountId: 'acc-1',
      isInstallment: false,
    });
    expect((db.incomeTransaction.findMany as any).mock.calls[0][0].where).toMatchObject({
      accountId: 'acc-1',
    });
  });

  it('tags + range keeps the combined filter', async () => {
    await GET(req('tagIds=t1&startDate=2026-11-03&endDate=2026-11-09'));
    const where = (db.expenseTransaction.aggregate as any).mock.calls[0][0].where;
    expect(where.tags).toEqual({ some: { id: { in: ['t1'] } } });
    expect(where.date.lt).toEqual(new Date('2026-11-10T00:00:00.000Z'));
  });

  it('expense where excludes installment parents; income where does not', async () => {
    await GET(req('tagIds=t1'));
    expect((db.expenseTransaction.findMany as any).mock.calls[0][0].where.isInstallment).toBe(false);
    expect((db.incomeTransaction.findMany as any).mock.calls[0][0].where).not.toHaveProperty('isInstallment');
  });

  it('rejects a reversed range with 400', async () => {
    const res = await GET(req('tagIds=t1&startDate=2026-11-09&endDate=2026-11-03'));
    expect(res.status).toBe(400);
    expect(db.expenseTransaction.aggregate).not.toHaveBeenCalled();
  });

  it('rejects no tags and no range with 400', async () => {
    expect((await GET(req(''))).status).toBe(400);
  });

  it('rejects a single date with no tags with 400', async () => {
    expect((await GET(req('startDate=2026-11-03'))).status).toBe(400);
  });

  it('rejects ISO-timestamp dates with 400', async () => {
    const res = await GET(req('tagIds=t1&startDate=2026-11-03T16:00:00.000Z'));
    expect(res.status).toBe(400);
  });

  it('merges both tables by date desc and reports hasMore', async () => {
    (db.expenseTransaction.findMany as any).mockResolvedValue([
      expenseRow('e1', '2026-11-05T00:00:00.000Z'),
      expenseRow('e2', '2026-11-03T00:00:00.000Z'),
    ]);
    (db.incomeTransaction.findMany as any).mockResolvedValue([
      incomeRow('i1', '2026-11-04T00:00:00.000Z'),
    ]);
    const body = await (await GET(req('tagIds=t1&take=2'))).json();
    expect(body.transactions.map((t: any) => t.id)).toEqual(['e1', 'i1']);
    expect(body.hasMore).toBe(true);
    expect((db.expenseTransaction.findMany as any).mock.calls[0][0].take).toBe(3);

    const page2 = await (await GET(req('tagIds=t1&take=2&skip=2'))).json();
    expect(page2.transactions.map((t: any) => t.id)).toEqual(['e2']);
    expect(page2.hasMore).toBe(false);
  });

  it('rounds totals and computes netAmount as expenses minus income', async () => {
    (db.expenseTransaction.aggregate as any).mockResolvedValue({ _sum: { amount: '100.105' }, _count: 3 });
    (db.incomeTransaction.aggregate as any).mockResolvedValue({ _sum: { amount: '40.10' }, _count: 2 });
    const body = await (await GET(req('tagIds=t1'))).json();
    expect(body).toMatchObject({
      totalExpenses: 100.11,
      totalIncome: 40.1,
      netAmount: 60.01,
      expenseCount: 3,
      incomeCount: 2,
    });
  });
});
