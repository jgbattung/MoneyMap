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
    transferTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    financialAccount: {
      update: vi.fn(),
    },
    expenseTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseType: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onTransferTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockExistingTransfer = {
  id: 'transfer-1',
  userId: 'user-123',
  name: 'Monthly Transfer',
  amount: 5000,
  fromAccountId: 'from-acc',
  toAccountId: 'to-acc',
  transferTypeId: 'type-1',
  date: new Date('2026-01-15'),
  notes: null,
  feeAmount: null,
  feeExpenseId: null,
  feeExpense: null,
  fromAccount: { id: 'from-acc', name: 'From Account' },
  toAccount: { id: 'to-acc', name: 'To Account' },
  transferType: { id: 'type-1', name: 'Internal Transfer' },
};

const mockExistingTransferWithFee = {
  ...mockExistingTransfer,
  feeAmount: 500,
  feeExpenseId: 'fee-exp-1',
  feeExpense: { id: 'fee-exp-1', amount: 500 },
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/transfer-transactions/transfer-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id = 'transfer-1') {
  return { params: Promise.resolve({ id }) };
}

function makeMockTx(overrides: Record<string, any> = {}) {
  return {
    transferTransaction: {
      update: vi.fn().mockResolvedValue({
        ...mockExistingTransfer,
        ...overrides,
      }),
    },
    financialAccount: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ name: 'From Account' }),
    },
    expenseTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'new-fee-exp', amount: 200 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    expenseType: {
      findFirst: vi.fn().mockResolvedValue({ id: 'fee-type-1', name: 'Transfer fee' }),
      create: vi.fn().mockResolvedValue({ id: 'fee-type-1', name: 'Transfer fee' }),
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransfer as any);
});

// -----------------------------------------------------------------------
// PATCH — Schema validation
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — schema validation', () => {
  it('returns 200 when only date changed (notes null in DB)', async () => {
    const mockTx = makeMockTx({ date: new Date('2026-03-15') });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when notes is explicitly null (regression: nullable field)', async () => {
    const mockTx = makeMockTx({ notes: null });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ notes: null }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when amount is provided as a JS number (regression: z.coerce.string)', async () => {
    const mockTx = makeMockTx({ amount: 12345 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ amount: 12345 }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when only name changed', async () => {
    const mockTx = makeMockTx({ name: 'Updated Transfer' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ name: 'Updated Transfer' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when all fields provided', async () => {
    const mockTx = makeMockTx({
      name: 'Full Update',
      amount: 7000,
      fromAccountId: 'from-acc',
      toAccountId: 'to-acc',
      transferTypeId: 'type-1',
      date: new Date('2026-03-15'),
      notes: 'Updated notes',
    });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    const response = await PATCH(
      makePatchRequest({
        name: 'Full Update',
        amount: '7000',
        fromAccountId: 'from-acc',
        toAccountId: 'to-acc',
        transferTypeId: 'type-1',
        date: '2026-03-15',
        notes: 'Updated notes',
      }),
      makeParams()
    );

    expect(response.status).toBe(200);
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: amount change, same accounts
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — balance logic (same accounts, amount change)', () => {
  it('adjusts both accounts when amount increases', async () => {
    const mockTx = makeMockTx({ amount: 6000 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ amount: '6000' }), makeParams());

    // amountDifference = 6000 - 5000 = 1000
    // fromAccount decremented by difference
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { decrement: 1000 } },
      })
    );

    // toAccount incremented by difference
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { increment: 1000 } },
      })
    );
  });

  it('adjusts both accounts when amount decreases', async () => {
    const mockTx = makeMockTx({ amount: 4000 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ amount: '4000' }), makeParams());

    // amountDifference = 4000 - 5000 = -1000
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { decrement: -1000 } },
      })
    );

    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { increment: -1000 } },
      })
    );
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: account changes
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — balance logic (account changes)', () => {
  it('reverses old and applies new when only fromAccountId changes', async () => {
    const mockTx = makeMockTx({ fromAccountId: 'new-from' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ fromAccountId: 'new-from' }), makeParams());

    // Reverse old transfer: old fromAcc incremented, old toAcc decremented
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );

    // Apply new transfer: new fromAcc decremented, toAcc incremented
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'new-from' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
  });

  it('reverses old and applies new when only toAccountId changes', async () => {
    const mockTx = makeMockTx({ toAccountId: 'new-to' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ toAccountId: 'new-to' }), makeParams());

    // Reverse old transfer
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );

    // Apply new transfer
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'new-to' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
  });

  it('reverses old and applies new when both accounts change', async () => {
    const mockTx = makeMockTx({ fromAccountId: 'new-from', toAccountId: 'new-to' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(
      makePatchRequest({ fromAccountId: 'new-from', toAccountId: 'new-to' }),
      makeParams()
    );

    // All 4 updates must happen
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'to-acc' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'new-from' }),
        data: { currentBalance: { decrement: 5000 } },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'new-to' }),
        data: { currentBalance: { increment: 5000 } },
      })
    );
  });
});

// -----------------------------------------------------------------------
// PATCH — Fee logic
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — fee logic', () => {
  it('creates fee expense and debits from account when fee added where none existed', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransfer as any);

    const mockTx = makeMockTx({ feeAmount: 200, feeExpenseId: 'new-fee-exp' });
    mockTx.expenseType.findFirst.mockResolvedValue({ id: 'fee-type-1', name: 'Transfer fee' });
    mockTx.financialAccount.findUnique.mockResolvedValue({ name: 'From Account' });
    mockTx.expenseTransaction.create.mockResolvedValue({ id: 'new-fee-exp', amount: 200 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ feeAmount: '200' }), makeParams());

    expect(mockTx.expenseTransaction.create).toHaveBeenCalled();
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { decrement: 200 } },
      })
    );
  });

  it('deletes fee expense and refunds from account when fee removed', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(
      mockExistingTransferWithFee as any
    );

    const mockTx = makeMockTx({ feeAmount: null, feeExpenseId: null });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ feeAmount: '' }), makeParams());

    expect(mockTx.expenseTransaction.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fee-exp-1' },
      })
    );
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { increment: 500 } },
      })
    );
  });

  it('updates fee expense and adjusts from account balance when fee amount changes', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(
      mockExistingTransferWithFee as any
    );

    const mockTx = makeMockTx({ feeAmount: 700, feeExpenseId: 'fee-exp-1' });
    mockTx.financialAccount.findUnique.mockResolvedValue({ name: 'From Account' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any, _opts?: any) => fn(mockTx));

    await PATCH(makePatchRequest({ feeAmount: '700' }), makeParams());

    expect(mockTx.expenseTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fee-exp-1' },
        data: expect.objectContaining({ amount: 700 }),
      })
    );

    // feeDifference = 700 - 500 = 200, so decrement by 200
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'from-acc' }),
        data: { currentBalance: { decrement: 200 } },
      })
    );
  });
});

// -----------------------------------------------------------------------
// PATCH — Auth and error paths
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — auth and error paths', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when transfer transaction not found', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Transfer transaction not found');
  });

  it('returns 400 when fromAccountId equals toAccountId', async () => {
    const response = await PATCH(
      makePatchRequest({ fromAccountId: 'same', toAccountId: 'same' }),
      makeParams()
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });
});
