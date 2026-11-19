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
    expenseTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseSubcategory: {
      findUnique: vi.fn(),
    },
    financialAccount: {
      count: vi.fn(),
      update: vi.fn(),
    },
    expenseType: { count: vi.fn() },
    incomeType: { count: vi.fn() },
    transferType: { count: vi.fn() },
    tag: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onExpenseTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockExistingExpense = {
  id: 'exp-1',
  userId: 'user-123',
  name: 'Groceries',
  amount: 100,
  accountId: 'account-a',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  date: new Date('2026-01-15'),
  description: null,
  isInstallment: false,
  isSystemGenerated: false,
  monthlyAmount: null,
  installmentDuration: null,
  remainingInstallments: null,
  installmentStartDate: null,
  lastProcessedDate: null,
  parentInstallmentId: null,
  installmentStatus: null,
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/expense-transactions/exp-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/expense-transactions/exp-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'exp-1') {
  return { params: Promise.resolve({ id }) };
}

function makeBatchResult(overrides: Record<string, any> = {}) {
  return [
    {}, // financialAccount.update placeholder
    {
      ...mockExistingExpense,
      ...overrides,
      tags: [],
    },
  ];
}

beforeEach(() => {
  vi.resetAllMocks();
  // Ownership pre-check: every referenced id belongs to the user by default
  for (const model of [db.financialAccount, db.expenseType, db.incomeType, db.transferType, db.tag]) {
    vi.mocked(model.count).mockImplementation(((args: any) => Promise.resolve(args.where.id.in.length)) as any);
  }
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(mockExistingExpense as any);
});

// -----------------------------------------------------------------------
// PATCH /api/expense-transactions/[id] — batch transaction form
// -----------------------------------------------------------------------
describe('PATCH /api/expense-transactions/[id] — batch transaction form', () => {
  it('calls db.$transaction with an array (not an async callback)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult() as any);

    await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });
});

// -----------------------------------------------------------------------
// PATCH — Schema validation
// -----------------------------------------------------------------------
describe('PATCH /api/expense-transactions/[id] — schema validation', () => {
  it('returns 200 when only date changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ date: new Date('2026-03-15') }) as any);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when only name changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ name: 'Food' }) as any);

    const response = await PATCH(makePatchRequest({ name: 'Food' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 200 when description is explicitly null', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ description: null }) as any);

    const response = await PATCH(makePatchRequest({ description: null }), makeParams());

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
describe('PATCH /api/expense-transactions/[id] — balance logic (same account, Pattern B)', () => {
  it('includes 1 financialAccount.update + 1 expenseTransaction.update when same account and amount changed', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 150 }) as any);

    await PATCH(makePatchRequest({ amount: '150' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [financialAccount.update, expenseTransaction.update]
    expect(callArg).toHaveLength(2);
  });

  it('includes 2 financialAccount.update calls when account changes (Pattern B)', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(
      [{}, {}, { ...mockExistingExpense, accountId: 'account-b', tags: [] }] as any
    );

    await PATCH(makePatchRequest({ accountId: 'account-b' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [oldAccUpdate, newAccUpdate, expenseTransaction.update]
    expect(callArg).toHaveLength(3);
  });
});

// -----------------------------------------------------------------------
// PATCH — Auth and error paths
// -----------------------------------------------------------------------
describe('PATCH /api/expense-transactions/[id] — auth and error paths', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when expense not found', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ date: '2026-03-15' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Expense transaction not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ amount: '150' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/expense-transactions/[id] — batch transaction pattern
// -----------------------------------------------------------------------
describe('DELETE /api/expense-transactions/[id]', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}] as any);
  });

  it('returns 200 with deleted=true for regular non-system expense', async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);
  });

  it('calls db.$transaction with an array (batch form, not async callback)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch for regular expense contains financialAccount.update + expenseTransaction.delete', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [financialAccount.update, expenseTransaction.delete]
    expect(callArg).toHaveLength(2);
  });

  it('reverses account balance when deleting a system-generated child payment', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockExistingExpense,
      isSystemGenerated: true,
      isInstallment: false,
      parentInstallmentId: 'parent-123',
    } as any);

    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [financialAccount.update, expenseTransaction.delete]
    expect(callArg).toHaveLength(2);
    expect(db.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentBalance: { increment: Number(mockExistingExpense.amount) } },
      })
    );
  });

  it('rejects parent installment delete with 400', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockExistingExpense,
      isInstallment: true,
    } as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Use DELETE \/api\/installments/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when expense not found', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Expense transaction not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('PATCH /api/expense-transactions/[id] - money validation', () => {
  it.each(['100.125', '1e3', ' '])('returns 400 and writes nothing for amount %j', async (amount) => {
    const response = await PATCH(makePatchRequest({ amount }), makeParams());

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.details.fieldErrors.amount).toContain('Amount must be a number with at most 2 decimals');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// AC7 characterization (MM-033): written and passing BEFORE remainingInstallments
// is dropped from the PATCH schema. The only intended post-change difference is
// that a non-installment row no longer gets remainingInstallments written as 0.
// -----------------------------------------------------------------------
describe('PATCH /api/expense-transactions/[id] - characterization of inline-table saves', () => {
  const tablePayload = {
    id: 'exp-1',
    name: 'Groceries',
    amount: '150',
    accountId: 'account-a',
    expenseTypeId: 'type-1',
    expenseSubcategoryId: null,
    date: '2026-01-15',
    description: null,
    isInstallment: false,
    installmentDuration: null,
    installmentStartDate: null,
    remainingInstallments: null,
    tagIds: [] as string[],
  };

  it('updates the amount and the balance and never turns the row into an installment', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 150 }) as any);

    const response = await PATCH(makePatchRequest(tablePayload), makeParams());

    expect(response.status).toBe(200);
    expect(db.financialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentBalance: { decrement: 50 } } })
    );
    const data = vi.mocked(db.expenseTransaction.update).mock.calls[0][0].data as any;
    expect(data.amount).toBe(150);
    expect(data.isInstallment).toBe(false);
    expect(data.installmentDuration).toBeUndefined();
    expect(data.monthlyAmount).toBeUndefined();
    // Today the null is coerced to 0; after the change the key is absent.
    expect([0, undefined]).toContain(data.remainingInstallments);
  });

  it('a regular edit with isInstallment:true and a duration still resets the counter to the duration', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult() as any);

    await PATCH(
      makePatchRequest({ amount: '1200', isInstallment: true, installmentDuration: 12 }),
      makeParams()
    );

    const data = vi.mocked(db.expenseTransaction.update).mock.calls[0][0].data as any;
    expect(data.remainingInstallments).toBe(12);
    expect(data.installmentDuration).toBe(12);
    expect(data.monthlyAmount).toBe(100);
  });
});

// Protected Behavior 6 (MM-033)
describe('PATCH /api/expense-transactions/[id] - server-owned remainingInstallments', () => {
  it('ignores a client-sent remainingInstallments and never writes it for a non-installment row', async () => {
    vi.mocked(db.$transaction).mockResolvedValue(makeBatchResult({ amount: 150 }) as any);

    const response = await PATCH(
      makePatchRequest({ amount: '150', isInstallment: false, remainingInstallments: 99 }),
      makeParams()
    );

    expect(response.status).toBe(200);
    const data = vi.mocked(db.expenseTransaction.update).mock.calls[0][0].data as any;
    expect(data).not.toHaveProperty('remainingInstallments');
  });
});

// Protected Behavior 8 (MM-033): ownership pre-check
describe('PATCH /api/expense-transactions/[id] - ownership', () => {
  it.each([
    ['Account not found', 'financialAccount'],
    ['Expense type not found', 'expenseType'],
    ['Tag not found', 'tag'],
  ])('returns 404 "%s" and writes nothing when the %s is not owned by the user', async (message, model) => {
    vi.mocked((db as any)[model].count).mockResolvedValue(0);

    const response = await PATCH(makePatchRequest({ accountId: 'account-b', expenseTypeId: 'type-2', tagIds: ['tag-1'] }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe(message);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
