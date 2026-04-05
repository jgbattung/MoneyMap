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
      delete: vi.fn(),
    },
    financialAccount: {
      findUnique: vi.fn(),
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

import { PATCH, DELETE } from './route';
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

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/transfer-transactions/transfer-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'transfer-1') {
  return { params: Promise.resolve({ id }) };
}

// Build a batch result array: last element is the updated transfer record
function makeBatchResult(transferOverrides: Record<string, any> = {}, extraOps = 0) {
  const updatedTransfer = {
    ...mockExistingTransfer,
    ...transferOverrides,
    fromAccount: { id: transferOverrides.fromAccountId ?? 'from-acc', name: 'From Account' },
    toAccount: { id: transferOverrides.toAccountId ?? 'to-acc', name: 'To Account' },
    transferType: { id: 'type-1', name: 'Internal Transfer' },
    feeExpense: transferOverrides.feeExpense ?? null,
    tags: [],
  };
  // extra ops are placeholders for financialAccount.update calls before the transfer update
  return [...Array(extraOps).fill({}), updatedTransfer];
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransfer as any);
});

// -----------------------------------------------------------------------
// PATCH — batch transaction form assertion
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — batch transaction form', () => {
  it('calls db.$transaction with an array (not an async callback)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({}, 2) as any);

    await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });
});

// -----------------------------------------------------------------------
// PATCH — Schema validation
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — schema validation', () => {
  it('returns 200 when only date changed (notes null in DB)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ date: new Date('2026-03-15') }, 0) as any);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when notes is explicitly null (regression: nullable field)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ notes: null }, 0) as any);

    const response = await PATCH(makePatchRequest({ notes: null }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when amount is provided as a JS number (regression: z.coerce.string)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 12345 }, 2) as any);

    const response = await PATCH(makePatchRequest({ amount: 12345 }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when only name changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ name: 'Updated Transfer' }, 0) as any);

    const response = await PATCH(makePatchRequest({ name: 'Updated Transfer' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when all fields provided', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({
        name: 'Full Update',
        amount: 7000,
        fromAccountId: 'from-acc',
        toAccountId: 'to-acc',
        transferTypeId: 'type-1',
        date: new Date('2026-03-15'),
        notes: 'Updated notes',
      }, 2) as any
    );

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
  it('includes 2 financialAccount.update calls when amount changes (same accounts)', async () => {
    // [fromUpdate, toUpdate, transferUpdate]
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 6000 }, 2) as any);

    await PATCH(makePatchRequest({ amount: '6000' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // amountDifference=1000, so 2 financialAccount updates + 1 transfer update = 3
    expect(callArg).toHaveLength(3);
  });

  it('includes no balance updates when nothing changed (no amount change, no account change)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({}, 0) as any);

    await PATCH(makePatchRequest({ name: 'Renamed Transfer' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // Only the transferTransaction.update
    expect(callArg).toHaveLength(1);
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: account changes
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — balance logic (account changes)', () => {
  it('includes 4 financialAccount.update calls when accounts change', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({ fromAccountId: 'new-from' }, 4) as any
    );

    await PATCH(makePatchRequest({ fromAccountId: 'new-from' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [reverseFrom, reverseTo, applyNewFrom, applyNewTo, transferUpdate] = 5
    expect(callArg).toHaveLength(5);
  });
});

// -----------------------------------------------------------------------
// PATCH — Fee logic (Pattern F)
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-transactions/[id] — fee logic (Pattern F)', () => {
  it('adds fee expense and debits from account when fee added where none existed', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransfer as any);
    vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'fee-type-1', name: 'Transfer fee' } as any);
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({ name: 'From Account' } as any);

    // [feeCreate, feeAccUpdate, transferUpdate] = 3
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({ feeAmount: 200, feeExpenseId: 'new-fee-exp' }, 2) as any
    );

    const response = await PATCH(makePatchRequest({ feeAmount: '200' }), makeParams());

    expect(response.status).toBe(200);
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [feeExpense.create, financialAccount.update (fee debit), transferTransaction.update]
    expect(callArg).toHaveLength(3);
  });

  it('deletes fee expense and refunds from account when fee removed', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransferWithFee as any);

    // [feeDelete, accUpdate(refund), transferUpdate] = 3
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({ feeAmount: null, feeExpenseId: null }, 2) as any
    );

    const response = await PATCH(makePatchRequest({ feeAmount: '' }), makeParams());

    expect(response.status).toBe(200);
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('updates fee expense and adjusts from account balance when fee amount changes', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransferWithFee as any);
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({ name: 'From Account' } as any);

    // [feeExpenseUpdate, accUpdate(feeDiff), transferUpdate] = 3
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({ feeAmount: 700, feeExpenseId: 'fee-exp-1' }, 2) as any
    );

    const response = await PATCH(makePatchRequest({ feeAmount: '700' }), makeParams());

    expect(response.status).toBe(200);
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('creates "Transfer fee" type if it does not exist (pre-transaction lookup)', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransfer as any);
    vi.mocked(db.expenseType.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseType.create).mockResolvedValue({ id: 'new-fee-type', name: 'Transfer fee' } as any);
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({ name: 'From Account' } as any);

    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({ feeAmount: 100, feeExpenseId: 'new-fee' }, 2) as any
    );

    await PATCH(makePatchRequest({ feeAmount: '100' }), makeParams());

    expect(db.expenseType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Transfer fee' }),
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

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ amount: '6000' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/transfer-transactions/[id] — batch transaction pattern
// -----------------------------------------------------------------------
describe('DELETE /api/transfer-transactions/[id]', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}] as any);
  });

  it('returns 200 on successful deletion without fee', async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Transfer transaction deleted successfully');
  });

  it('calls db.$transaction with an array (batch form)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch without fee contains 3 operations [fromUpdate, toUpdate, transferDelete]', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('batch WITH fee contains 5 operations [fromUpdate, toUpdate, feeRefund, feeDelete, transferDelete]', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(mockExistingTransferWithFee as any);
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}, {}, {}] as any);

    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(5);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when transfer transaction not found', async () => {
    vi.mocked(db.transferTransaction.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Transfer transaction not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
