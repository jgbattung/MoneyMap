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
    payPlan: { findFirst: vi.fn() },
    incomeTransaction: { findFirst: vi.fn() },
    payDivision: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    payDivisionItem: { findFirst: vi.fn(), update: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { GET, POST } from './route';
import { DELETE } from './[id]/route';
import { PATCH } from './[id]/items/[itemId]/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = { user: { id: 'user-123' }, session: { id: 's' } };

const plan = {
  id: 'plan-1',
  userId: 'user-123',
  name: 'Jun plan',
  savePercent: '30',
  sourceAccountId: 'src',
  saveAccountId: 'sav',
  spendAccountId: 'spd',
  transferTypeId: 'tt-1',
  lines: [
    { name: 'EF', kind: 'PERCENT', value: '50' },
    { name: 'Gotrade', kind: 'PERCENT', value: '17.5' },
    { name: 'MP2', kind: 'PERCENT', value: '17.5' },
    { name: 'Sinking', kind: 'PERCENT', value: '15' },
    { name: 'Papa TW', kind: 'FIXED', value: '1000', from: 'SPEND' },
  ],
};

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/pay-divisions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validBody = { planId: 'plan-1', payAmount: '34495.53', payDate: '2026-06-15' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.payPlan.findFirst as any).mockResolvedValue(plan);
  vi.mocked(db.incomeTransaction.findFirst as any).mockResolvedValue({ id: 'inc-1' });
  vi.mocked(db.$transaction as any).mockResolvedValue([]);
  vi.mocked(db.payDivision.create as any).mockImplementation((args: unknown) => ({ op: 'division', args }));
  vi.mocked(db.payDivisionItem.createMany as any).mockImplementation((args: unknown) => ({ op: 'children', args }));
});

describe('GET /api/pay-divisions', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await GET()).status).toBe(401);
  });

  it('lists the latest 20 for the user, newest first', async () => {
    vi.mocked(db.payDivision.findMany as any).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(vi.mocked(db.payDivision.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-123' },
      orderBy: [{ payDate: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
  });
});

describe('POST /api/pay-divisions', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await POST(req('POST', validBody))).status).toBe(401);
  });

  it('returns 400 on invalid input', async () => {
    expect((await POST(req('POST', { ...validBody, payAmount: '-5' }))).status).toBe(400);
  });

  it('returns 404 for a plan that is not the user own', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue(null);
    expect((await POST(req('POST', validBody))).status).toBe(404);
    expect(vi.mocked(db.payPlan.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'plan-1', userId: 'user-123' },
    });
  });

  it('returns 404 for a foreign income transaction', async () => {
    vi.mocked(db.incomeTransaction.findFirst as any).mockResolvedValue(null);
    const res = await POST(req('POST', { ...validBody, incomeTransactionId: 'inc-x' }));
    expect(res.status).toBe(404);
    expect(vi.mocked(db.incomeTransaction.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'inc-x', userId: 'user-123' },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 for an unusable plan', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue({ ...plan, saveAccountId: null });
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when the split cannot be computed', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue({
      ...plan,
      lines: [...plan.lines.slice(0, 4), { name: 'Big', kind: 'FIXED', value: '99999', from: 'SPEND' }],
    });
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/exceed the Spend amount/);
  });

  it('recomputes the split server-side and ignores tampered client amounts', async () => {
    const res = await POST(
      req('POST', { ...validBody, saveAmount: '1.00', spendAmount: '1.00', items: [{ amount: '1' }] })
    );
    expect(res.status).toBe(201);
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(2);
    const division = ops[0].args.data;
    expect(division).toMatchObject({
      userId: 'user-123',
      planId: 'plan-1',
      planName: 'Jun plan',
      payAmount: '34495.53',
      saveAmount: '10348.66',
      spendAmount: '23146.87',
    });
    expect(division.payDate).toEqual(new Date('2026-06-15'));

    const parents = division.items.create;
    const children = ops[1].args.data;
    const savings = parents.find((p: any) => p.label === 'Savings');
    const spending = parents.find((p: any) => p.label === 'Spending');
    expect(savings).toMatchObject({
      kind: 'TRANSFER',
      amount: '11348.66',
      fromAccountId: 'src',
      toAccountId: 'sav',
      transferTypeId: 'tt-1',
    });
    expect(spending.amount).toBe('23146.87');
    const amounts = Object.fromEntries(children.map((c: any) => [c.label, c.amount]));
    expect(amounts).toEqual({
      EF: '5174.33',
      Gotrade: '1811.02',
      MP2: '1811.01',
      Sinking: '1552.30',
      'Papa TW': '1000.00',
    });
    expect(children.every((c: any) => c.parentItemId === savings.id)).toBe(true);
    expect(children.every((c: any) => c.divisionId === division.id)).toBe(true);
    expect(children.every((c: any) => c.kind === 'EARMARK' && c.transferTypeId === null)).toBe(true);
  });

  it('makes every line a top-level earmark and skips the child batch when save equals source', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue({ ...plan, saveAccountId: 'src' });
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(1);
    expect(db.payDivisionItem.createMany).not.toHaveBeenCalled();
    const parents = ops[0].args.data.items.create;
    expect(parents.map((p: any) => p.label)).toEqual(['EF', 'Gotrade', 'MP2', 'Sinking', 'Papa TW', 'Spending']);
    expect(parents.filter((p: any) => p.kind === 'TRANSFER').map((p: any) => p.label)).toEqual(['Spending']);
    expect(parents.every((p: any) => p.parentItemId === null)).toBe(true);
    expect(parents.map((p: any) => p.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('creates no transfer rows when both save and spend equal the source', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue({ ...plan, saveAccountId: 'src', spendAccountId: 'src' });
    await POST(req('POST', validBody));
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    const parents = ops[0].args.data.items.create;
    expect(parents.every((p: any) => p.kind === 'EARMARK')).toBe(true);
  });

  it('stores the linked income transaction and snapshots the plan', async () => {
    const res = await POST(req('POST', { ...validBody, incomeTransactionId: 'inc-1' }));
    expect(res.status).toBe(201);
    expect(vi.mocked(db.incomeTransaction.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'inc-1', userId: 'user-123' },
    });
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    expect(ops[0].args.data).toMatchObject({
      incomeTransactionId: 'inc-1',
      planName: 'Jun plan',
      savePercent: '30',
    });
    expect(await res.json()).toEqual({ id: ops[0].args.data.id });
  });

  it('scopes the plan lookup by user and does not look up income when none is given', async () => {
    await POST(req('POST', validBody));
    expect(vi.mocked(db.payPlan.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'plan-1', userId: 'user-123' },
    });
    expect(db.incomeTransaction.findFirst).not.toHaveBeenCalled();
    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    expect(ops[0].args.data.incomeTransactionId).toBeNull();
  });

  it('returns 400 when the stored plan lines are malformed', async () => {
    vi.mocked(db.payPlan.findFirst as any).mockResolvedValue({ ...plan, lines: [{ name: '', kind: 'X' }] });
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 500 on an unexpected database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(db.$transaction as any).mockRejectedValue(new Error('connection lost'));
    expect((await POST(req('POST', validBody))).status).toBe(500);
    consoleSpy.mockRestore();
  });

  it('returns 409 when the income transaction is already divided', async () => {
    vi.mocked(db.$transaction as any).mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' })
    );
    const res = await POST(req('POST', { ...validBody, incomeTransactionId: 'inc-1' }));
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/pay-divisions/[id]', () => {
  const params = { params: Promise.resolve({ id: 'div-1' }) };

  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await DELETE(req('DELETE'), params)).status).toBe(401);
  });

  it('deletes scoped by user and maps P2025 to 404', async () => {
    vi.mocked(db.payDivision.delete as any).mockResolvedValue({});
    expect((await DELETE(req('DELETE'), params)).status).toBe(200);
    expect(vi.mocked(db.payDivision.delete).mock.calls[0][0]).toMatchObject({
      where: { id: 'div-1', userId: 'user-123' },
    });
    vi.mocked(db.payDivision.delete as any).mockRejectedValueOnce(
      Object.assign(new Error('nf'), { code: 'P2025' })
    );
    expect((await DELETE(req('DELETE'), params)).status).toBe(404);
  });
});

describe('PATCH /api/pay-divisions/[id]/items/[itemId]', () => {
  const params = { params: Promise.resolve({ id: 'div-1', itemId: 'item-1' }) };

  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await PATCH(req('PATCH', { done: true }), params)).status).toBe(401);
  });

  it('returns 400 on a bad body', async () => {
    expect((await PATCH(req('PATCH', { done: 'yes' }), params)).status).toBe(400);
  });

  it('returns 404 when the item is not in the user division', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue(null);
    expect((await PATCH(req('PATCH', { done: true }), params)).status).toBe(404);
    expect(vi.mocked(db.payDivisionItem.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'item-1', divisionId: 'div-1', division: { userId: 'user-123' } },
    });
    expect(db.payDivisionItem.update).not.toHaveBeenCalled();
  });

  it('updates only the checked item by id after the ownership check', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({ id: 'item-1', kind: 'EARMARK' });
    vi.mocked(db.payDivisionItem.update as any).mockResolvedValue({ id: 'item-1' });
    await PATCH(req('PATCH', { done: true }), params);
    expect(vi.mocked(db.payDivisionItem.update).mock.calls[0][0].where).toEqual({ id: 'item-1' });
    expect(Object.keys(vi.mocked(db.payDivisionItem.update).mock.calls[0][0].data)).toEqual(['completedAt']);
  });

  it('rejects a TRANSFER item', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({ id: 'item-1', kind: 'TRANSFER' });
    const res = await PATCH(req('PATCH', { done: true }), params);
    expect(res.status).toBe(400);
    expect(db.payDivisionItem.update).not.toHaveBeenCalled();
  });

  it('sets completedAt to now when done and null when undone', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({ id: 'item-1', kind: 'EARMARK' });
    vi.mocked(db.payDivisionItem.update as any).mockResolvedValue({ id: 'item-1' });
    expect((await PATCH(req('PATCH', { done: true }), params)).status).toBe(200);
    expect(vi.mocked(db.payDivisionItem.update).mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
    await PATCH(req('PATCH', { done: false }), params);
    expect(vi.mocked(db.payDivisionItem.update).mock.calls[1][0].data.completedAt).toBeNull();
  });
});
