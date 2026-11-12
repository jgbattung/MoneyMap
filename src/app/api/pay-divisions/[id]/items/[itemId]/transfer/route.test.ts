/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('next/server', async (importActual) => {
  const mod = await importActual<typeof import('next/server')>();
  return {
    ...mod,
    after: (cb: () => unknown) => { void cb(); },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    payDivisionItem: { findFirst: vi.fn(), update: vi.fn() },
    financialAccount: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onTransferTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { onTransferTransactionChange } from '@/lib/statement-recalculator';

const mockSession = { user: { id: 'user-123' }, session: { id: 's' } };
const params = { params: Promise.resolve({ id: 'div-1', itemId: 'item-1' }) };

const transferItem = {
  id: 'item-1',
  divisionId: 'div-1',
  kind: 'TRANSFER',
  label: 'Savings',
  fromAccountId: 'src',
  toAccountId: 'sav',
  transferTypeId: 'tt-1',
  transferTransactionId: null,
};

function req(body: unknown) {
  return new NextRequest('http://localhost/api/pay-divisions/div-1/items/item-1/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { amount: '11348.66', date: '2026-06-17' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue(transferItem);
  vi.mocked(db.payDivisionItem.update as any).mockImplementation((args: unknown) => ({ op: 'item', args }));
  vi.mocked(db.financialAccount.update as any).mockImplementation((args: unknown) => ({ op: 'account', args }));
  vi.mocked(db.$transaction as any).mockResolvedValue([
    { id: 'item-1', transferTransaction: { id: 'tr-1' } },
    { id: 'src', accountType: 'CHECKING' },
    { id: 'sav', accountType: 'SAVINGS' },
  ]);
});

describe('POST /api/pay-divisions/[id]/items/[itemId]/transfer', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await POST(req(validBody), params)).status).toBe(401);
  });

  it('returns 400 on an invalid body', async () => {
    expect((await POST(req({ amount: '0', date: '2026-06-17' }), params)).status).toBe(400);
    expect((await POST(req({ amount: '5', date: 'tomorrow' }), params)).status).toBe(400);
  });

  it('returns 404 for an item in another user division', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue(null);
    expect((await POST(req(validBody), params)).status).toBe(404);
    expect(vi.mocked(db.payDivisionItem.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: 'item-1', divisionId: 'div-1', division: { userId: 'user-123' } },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 for an EARMARK item', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({ ...transferItem, kind: 'EARMARK' });
    expect((await POST(req(validBody), params)).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(['fromAccountId', 'toAccountId', 'transferTypeId'])(
    'returns 400 when %s is null',
    async (field) => {
      vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({ ...transferItem, [field]: null });
      expect((await POST(req(validBody), params)).status).toBe(400);
      expect(db.$transaction).not.toHaveBeenCalled();
    }
  );

  it('returns 409 when the row is already linked', async () => {
    vi.mocked(db.payDivisionItem.findFirst as any).mockResolvedValue({
      ...transferItem,
      transferTransactionId: 'tr-existing',
    });
    expect((await POST(req(validBody), params)).status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 409 and commits nothing when the guarded update throws P2025', async () => {
    vi.mocked(db.$transaction as any).mockRejectedValue(
      Object.assign(new Error('not found'), { code: 'P2025' })
    );
    const res = await POST(req(validBody), params);
    expect(res.status).toBe(409);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(onTransferTransactionChange).not.toHaveBeenCalled();
  });

  it('runs exactly one transaction with the item link, from decrement and to increment in order', async () => {
    const res = await POST(req({ amount: '11000.50', date: '2026-06-18' }), params);
    expect(res.status).toBe(201);
    expect(db.$transaction).toHaveBeenCalledTimes(1);

    const ops = vi.mocked(db.$transaction).mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(3);

    expect(ops[0].op).toBe('item');
    expect(ops[0].args.where).toEqual({
      id: 'item-1',
      AND: [{ transferTransactionId: null }],
    });
    expect(ops[0].args.data.transferTransaction.create).toEqual({
      userId: 'user-123',
      name: 'Pay division: Savings',
      amount: 11000.5,
      fromAccountId: 'src',
      toAccountId: 'sav',
      transferTypeId: 'tt-1',
      date: new Date('2026-06-18'),
    });

    expect(ops[1].op).toBe('account');
    expect(ops[1].args).toEqual({
      where: { id: 'src' },
      data: { currentBalance: { decrement: 11000.5 } },
    });
    expect(ops[2].op).toBe('account');
    expect(ops[2].args).toEqual({
      where: { id: 'sav' },
      data: { currentBalance: { increment: 11000.5 } },
    });
  });

  it('defers the statement recalculation with the account types', async () => {
    await POST(req(validBody), params);
    expect(onTransferTransactionChange).toHaveBeenCalledWith(
      'src',
      'sav',
      'tt-1',
      new Date('2026-06-17'),
      undefined,
      'CHECKING',
      'SAVINGS'
    );
  });
});
