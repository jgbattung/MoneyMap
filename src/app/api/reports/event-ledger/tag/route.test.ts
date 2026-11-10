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
    expenseTransaction: { update: vi.fn((a: any) => ({ op: 'expense.update', ...a })), findMany: vi.fn() },
    incomeTransaction: { update: vi.fn((a: any) => ({ op: 'income.update', ...a })), findMany: vi.fn() },
    tag: { update: vi.fn((a: any) => ({ op: 'tag.update', ...a })) },
    $transaction: vi.fn(async (ops: any[]) => ops),
  },
}));

import { PATCH } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const session = { user: { id: 'user-123' }, session: { id: 's' } };

function req(body: unknown) {
  return new NextRequest('http://localhost/api/reports/event-ledger/tag', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const filter = { startDate: '2026-11-03', endDate: '2026-11-09' };

beforeEach(() => {
  vi.clearAllMocks();
  (auth.api.getSession as any).mockResolvedValue(session);
  (db.expenseTransaction.findMany as any).mockResolvedValue([]);
  (db.incomeTransaction.findMany as any).mockResolvedValue([]);
});

describe('PATCH /api/reports/event-ledger/tag - ids body', () => {
  it('returns 401 without a session', async () => {
    (auth.api.getSession as any).mockResolvedValue(null);
    const res = await PATCH(req({ transactionIds: ['a'], transactionType: 'expense', tagIds: ['t1'] }));
    expect(res.status).toBe(401);
  });

  it('updates each expense with a userId-scoped where', async () => {
    const res = await PATCH(
      req({ transactionIds: ['a', 'b'], transactionType: 'expense', tagIds: ['t1'] })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, tagged: 2 });
    const calls = (db.expenseTransaction.update as any).mock.calls.map((c: any) => c[0]);
    expect(calls).toEqual([
      { where: { id: 'a', userId: 'user-123' }, data: { tags: { connect: [{ id: 't1' }] } } },
      { where: { id: 'b', userId: 'user-123' }, data: { tags: { connect: [{ id: 't1' }] } } },
    ]);
    expect(db.incomeTransaction.update).not.toHaveBeenCalled();
    expect(db.tag.update).not.toHaveBeenCalled();
  });

  it('updates incomes for the income type', async () => {
    await PATCH(req({ transactionIds: ['i1'], transactionType: 'income', tagIds: ['t1', 't2'] }));
    expect((db.incomeTransaction.update as any).mock.calls[0][0]).toEqual({
      where: { id: 'i1', userId: 'user-123' },
      data: { tags: { connect: [{ id: 't1' }, { id: 't2' }] } },
    });
    expect(db.expenseTransaction.update).not.toHaveBeenCalled();
  });

  it('maps P2025 to 404', async () => {
    (db.$transaction as any).mockRejectedValueOnce({ code: 'P2025' });
    const res = await PATCH(req({ transactionIds: ['a'], transactionType: 'expense', tagIds: ['t1'] }));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/reports/event-ledger/tag - filter body', () => {
  it('resolves ids with the shared where and connects from the Tag side in one transaction', async () => {
    (db.expenseTransaction.findMany as any).mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    (db.incomeTransaction.findMany as any).mockResolvedValue([{ id: 'i1' }]);

    const res = await PATCH(req({ filter: { ...filter, accountId: 'acc-1' }, tagIds: ['t1', 't2'] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, tagged: 3 });

    const range = {
      gte: new Date('2026-11-03T00:00:00.000Z'),
      lt: new Date('2026-11-10T00:00:00.000Z'),
    };
    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', date: range, accountId: 'acc-1', isInstallment: false },
      select: { id: true },
    });
    expect(db.incomeTransaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', date: range, accountId: 'acc-1' },
      select: { id: true },
    });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const tagCalls = (db.tag.update as any).mock.calls.map((c: any) => c[0]);
    expect(tagCalls).toEqual([
      {
        where: { id: 't1', userId: 'user-123' },
        data: {
          expenseTransactions: { connect: [{ id: 'e1' }, { id: 'e2' }] },
          incomeTransactions: { connect: [{ id: 'i1' }] },
        },
      },
      {
        where: { id: 't2', userId: 'user-123' },
        data: {
          expenseTransactions: { connect: [{ id: 'e1' }, { id: 'e2' }] },
          incomeTransactions: { connect: [{ id: 'i1' }] },
        },
      },
    ]);
    expect(((db.$transaction as any).mock.calls[0][0] as any[]).length).toBe(2);
  });

  it('handles more than 50 matches in a single request', async () => {
    (db.expenseTransaction.findMany as any).mockResolvedValue(
      Array.from({ length: 120 }, (_, i) => ({ id: `e${i}` }))
    );
    const res = await PATCH(req({ filter, tagIds: ['t1'] }));
    expect(await res.json()).toEqual({ success: true, tagged: 120 });
    expect((db.tag.update as any).mock.calls[0][0].data.expenseTransactions.connect).toHaveLength(120);
  });

  it('writes nothing when no transactions match', async () => {
    const res = await PATCH(req({ filter, tagIds: ['t1'] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, tagged: 0 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.tag.update).not.toHaveBeenCalled();
  });

  it('rejects a filter missing endDate', async () => {
    const res = await PATCH(req({ filter: { startDate: '2026-11-03' }, tagIds: ['t1'] }));
    expect(res.status).toBe(400);
    expect(db.expenseTransaction.findMany).not.toHaveBeenCalled();
  });

  it('rejects a reversed filter', async () => {
    const res = await PATCH(
      req({ filter: { startDate: '2026-11-09', endDate: '2026-11-03' }, tagIds: ['t1'] })
    );
    expect(res.status).toBe(400);
  });

  it('maps P2025 (foreign tag) to 404', async () => {
    (db.expenseTransaction.findMany as any).mockResolvedValue([{ id: 'e1' }]);
    (db.$transaction as any).mockRejectedValueOnce({ code: 'P2025' });
    const res = await PATCH(req({ filter, tagIds: ['foreign'] }));
    expect(res.status).toBe(404);
  });
});
