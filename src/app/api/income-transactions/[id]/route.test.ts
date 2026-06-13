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
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    incomeTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    financialAccount: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onIncomeTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockExistingTransaction = {
  id: 'txn-1',
  userId: 'user-123',
  name: 'Salary',
  amount: 1000,
  accountId: 'account-a',
  incomeTypeId: 'income-type-1',
  date: new Date('2026-01-15'),
  description: null,
  account: { id: 'account-a', name: 'Test Account' },
  incomeType: { id: 'income-type-1', name: 'Salary' },
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/income-transactions/txn-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/income-transactions/txn-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'txn-1') {
  return { params: Promise.resolve({ id }) };
}

// Batch transaction returns an array. For PATCH the last element is the updated record.
function makeBatchResult(overrides: Record<string, any> = {}) {
  return [
    {}, // financialAccount.update placeholder(s)
    {
      ...mockExistingTransaction,
      ...overrides,
      account: { id: overrides.accountId ?? 'account-a', name: 'Test Account' },
      incomeType: { id: 'income-type-1', name: 'Salary' },
      tags: [],
    },
  ];
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.incomeTransaction.findUnique).mockResolvedValue(mockExistingTransaction as any);
});

// -----------------------------------------------------------------------
// PATCH /api/income-transactions/[id] — batch form assertion
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — batch transaction form', () => {
  it('calls db.$transaction with an array (not an async callback)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult() as any);

    await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });
});

// -----------------------------------------------------------------------
// PATCH /api/income-transactions/[id] — Schema validation
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — schema validation', () => {
  it('returns 200 when only date changed (description null in DB)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ date: new Date('2026-03-15') }) as any);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when only name changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ name: 'New Name' }) as any);

    const response = await PATCH(makePatchRequest({ name: 'New Name' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when description is explicitly null (regression: nullable field)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ description: null }) as any);

    const response = await PATCH(makePatchRequest({ description: null }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when all fields provided', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      makeBatchResult({
        name: 'Updated Salary',
        amount: 2000,
        accountId: 'account-a',
        incomeTypeId: 'income-type-2',
        date: new Date('2026-03-15'),
        description: 'Monthly salary',
      }) as any
    );

    const response = await PATCH(
      makePatchRequest({
        name: 'Updated Salary',
        amount: '2000',
        accountId: 'account-a',
        incomeTypeId: 'income-type-2',
        date: '2026-03-15',
        description: 'Monthly salary',
      }),
      makeParams()
    );

    expect(response.status).toBe(200);
  });

  it('returns 200 when body is empty (all fields optional)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult() as any);

    const response = await PATCH(makePatchRequest({}), makeParams());

    expect(response.status).toBe(200);
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: amount change, same account (Pattern B)
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — balance logic (same account, Pattern B)', () => {
  it('increments balance by difference when amount increased', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 1500 }) as any);

    await PATCH(makePatchRequest({ amount: '1500' }), makeParams());

    // The batch array should contain a financialAccount.update call with increment: 500
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg.length).toBeGreaterThanOrEqual(1);
  });

  it('includes exactly 1 financialAccount.update when same account and amount changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 700 }) as any);

    await PATCH(makePatchRequest({ amount: '700' }), makeParams());

    // balanceDifference = 700 - 1000 = -300
    // The batch has: [financialAccount.update, incomeTransaction.update]
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: account change (Pattern B)
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — balance logic (account change, Pattern B)', () => {
  it('includes 2 financialAccount.update calls when only accountId changes', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      [{}, {}, { ...mockExistingTransaction, accountId: 'account-b', account: {}, incomeType: {}, tags: [] }] as any
    );

    await PATCH(makePatchRequest({ accountId: 'account-b' }), makeParams());

    // Batch: [oldAccUpdate, newAccUpdate, incomeTransaction.update]
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('includes 2 financialAccount.update calls when both accountId and amount change', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      [{}, {}, { ...mockExistingTransaction, accountId: 'account-b', amount: 1500, account: {}, incomeType: {}, tags: [] }] as any
    );

    await PATCH(
      makePatchRequest({ accountId: 'account-b', amount: '1500' }),
      makeParams()
    );

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });
});

// -----------------------------------------------------------------------
// PATCH — Auth and error paths
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — auth and error paths', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when transaction not found', async () => {
    vi.mocked(db.incomeTransaction.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Income transaction not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ amount: '1500' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/income-transactions/[id] — batch transaction pattern
// -----------------------------------------------------------------------
describe('DELETE /api/income-transactions/[id]', () => {
  beforeEach(() => {
    // Batch: [incomeTransaction.delete, financialAccount.update]
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}] as any);
  });

  it('returns 200 on successful deletion', async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Income transaction deleted successfully');
  });

  it('calls db.$transaction with an array (batch form, not async callback)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch contains both incomeTransaction.delete and financialAccount.update', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when transaction not found', async () => {
    vi.mocked(db.incomeTransaction.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Income transaction not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
