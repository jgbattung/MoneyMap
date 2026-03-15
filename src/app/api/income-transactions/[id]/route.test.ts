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
    incomeTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { PATCH } from './route';
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

function makeParams(id = 'txn-1') {
  return { params: Promise.resolve({ id }) };
}

function makeMockTx(overrides: Record<string, any> = {}) {
  return {
    incomeTransaction: {
      update: vi.fn().mockResolvedValue({
        ...mockExistingTransaction,
        ...overrides,
      }),
    },
    financialAccount: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.incomeTransaction.findUnique).mockResolvedValue(mockExistingTransaction as any);
});

// -----------------------------------------------------------------------
// PATCH /api/income-transactions/[id] — Schema validation
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — schema validation', () => {
  it('returns 200 when only date changed (description null in DB)', async () => {
    const mockTx = makeMockTx({ date: new Date('2026-03-15') });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when only name changed', async () => {
    const mockTx = makeMockTx({ name: 'New Name' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ name: 'New Name' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when description is explicitly null (regression: nullable field)', async () => {
    const mockTx = makeMockTx({ description: null });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({ description: null }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when all fields provided', async () => {
    const mockTx = makeMockTx({
      name: 'Updated Salary',
      amount: 2000,
      accountId: 'account-a',
      incomeTypeId: 'income-type-2',
      date: new Date('2026-03-15'),
      description: 'Monthly salary',
    });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

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

  it('returns 200 when body is empty (all fields optional, no guard in route)', async () => {
    const mockTx = makeMockTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    const response = await PATCH(makePatchRequest({}), makeParams());

    expect(response.status).toBe(200);
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: amount change, same account
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — balance logic (same account)', () => {
  it('increments balance by difference when amount increased', async () => {
    const mockTx = makeMockTx({ amount: 1500 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    await PATCH(makePatchRequest({ amount: '1500' }), makeParams());

    // balanceDifference = 1500 - 1000 = 500
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-a' }),
        data: { currentBalance: { increment: 500 } },
      })
    );
  });

  it('increments balance by negative difference when amount decreased', async () => {
    const mockTx = makeMockTx({ amount: 700 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    await PATCH(makePatchRequest({ amount: '700' }), makeParams());

    // balanceDifference = 700 - 1000 = -300
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-a' }),
        data: { currentBalance: { increment: -300 } },
      })
    );
  });
});

// -----------------------------------------------------------------------
// PATCH — Balance logic: account change
// -----------------------------------------------------------------------
describe('PATCH /api/income-transactions/[id] — balance logic (account change)', () => {
  it('moves existing amount when only accountId changes', async () => {
    const mockTx = makeMockTx({ accountId: 'account-b' });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    await PATCH(makePatchRequest({ accountId: 'account-b' }), makeParams());

    // Old account gets decremented by existing amount (1000)
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-a' }),
        data: { currentBalance: { decrement: 1000 } },
      })
    );

    // New account gets incremented by existing amount (1000)
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-b' }),
        data: { currentBalance: { increment: 1000 } },
      })
    );
  });

  it('reverses old account and applies new amount to new account when both accountId and amount change', async () => {
    const mockTx = makeMockTx({ accountId: 'account-b', amount: 1500 });
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(mockTx));

    await PATCH(
      makePatchRequest({ accountId: 'account-b', amount: '1500' }),
      makeParams()
    );

    // Old account gets decremented by old amount (1000)
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-a' }),
        data: { currentBalance: { decrement: 1000 } },
      })
    );

    // New account gets incremented by new amount (1500)
    expect(mockTx.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'account-b' }),
        data: { currentBalance: { increment: 1500 } },
      })
    );
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
});
