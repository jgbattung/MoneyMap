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
    expenseTransaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    expenseSubcategory: {
      findUnique: vi.fn(),
    },
    financialAccount: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onExpenseTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { onExpenseTransactionChange } from '@/lib/statement-recalculator';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockInstallment = {
  id: 'inst-1',
  userId: 'user-123',
  name: 'iPhone 16',
  amount: 60000,
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  date: new Date('2026-01-01'),
  isInstallment: true,
  installmentStatus: 'ACTIVE',
  installmentDuration: 6,
  remainingInstallments: 4,
  installmentStartDate: new Date('2026-01-01'),
  monthlyAmount: 10000,
  lastProcessedDate: null,
};

const mockChild = {
  id: 'child-1',
  userId: 'user-123',
  accountId: 'acc-1',
  amount: 10000,
  date: new Date('2026-01-01'),
  parentInstallmentId: 'inst-1',
  isSystemGenerated: true,
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/installments/inst-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/installments/inst-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'inst-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(mockInstallment as any);
  vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockChild] as any);
  vi.mocked(db.$transaction).mockResolvedValue([
    {}, // balance ops placeholder
    { ...mockInstallment, account: { id: 'acc-1', name: 'GCash' }, expenseType: { id: 'type-1', name: 'Electronics' }, expenseSubcategory: null },
  ] as any);
});

// -----------------------------------------------------------------------
// PATCH — Auth and basic guards
// -----------------------------------------------------------------------
describe('PATCH /api/installments/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'New Name' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when installment not found', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'New Name' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('returns 400 when target is not an installment', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockInstallment,
      isInstallment: false,
    } as any);

    const response = await PATCH(makePatchRequest({ name: 'New Name' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Not an installment');
  });

  it('returns 400 when a locked field (installmentDuration) is present', async () => {
    const response = await PATCH(
      makePatchRequest({ name: 'New Name', installmentDuration: 12 }),
      makeParams()
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Field not editable: installmentDuration/);
  });

  it('returns 400 when a locked field (accountId) is present', async () => {
    const response = await PATCH(
      makePatchRequest({ name: 'New Name', accountId: 'acc-2' }),
      makeParams()
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Field not editable: accountId/);
  });

  it('returns 400 when a locked field (tagIds) is present', async () => {
    const response = await PATCH(
      makePatchRequest({ name: 'New Name', tagIds: ['tag-1'] }),
      makeParams()
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Field not editable: tagIds/);
  });

  it('recomputes monthlyAmount when amount changes', async () => {
    const updatedInstallment = {
      ...mockInstallment,
      amount: 72000,
      monthlyAmount: 12000,
      account: { id: 'acc-1', name: 'GCash' },
      expenseType: { id: 'type-1', name: 'Electronics' },
      expenseSubcategory: null,
    };
    // Route does results[results.length - 1] so put updated row as last element
    vi.mocked(db.$transaction).mockResolvedValue([updatedInstallment] as any);

    const response = await PATCH(makePatchRequest({ amount: '72000' }), makeParams());

    expect(response.status).toBe(200);
    const data = await response.json();
    // monthlyAmount should reflect new calculation: 72000 / 6 = 12000
    expect(data.monthlyAmount).toBe(12000);
  });

  it('deletes children before new start date and resets remainingInstallments when date moved forward', async () => {
    // Set a lastProcessedDate and child date before the new start
    const oldStart = new Date('2026-01-01');
    const newStart = new Date('2026-04-01');

    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockInstallment,
      installmentStartDate: oldStart,
      date: oldStart,
    } as any);

    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      { ...mockChild, date: new Date('2026-01-15') }, // before newStart
    ] as any);

    const updatedRow = {
      ...mockInstallment,
      installmentStartDate: newStart,
      date: newStart,
      remainingInstallments: 6,
      lastProcessedDate: null,
      account: { id: 'acc-1', name: 'GCash' },
      expenseType: { id: 'type-1', name: 'Electronics' },
      expenseSubcategory: null,
    };
    vi.mocked(db.$transaction).mockResolvedValue([updatedRow] as any);

    const response = await PATCH(
      makePatchRequest({ installmentStartDate: '2026-04-01' }),
      makeParams()
    );

    expect(response.status).toBe(200);

    // Should have called $transaction with child delete operations
    const transactionArg = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // Should include balance restore + child delete + parent update
    expect(transactionArg.length).toBeGreaterThan(1);
  });

  it('only updates parent when start date moved backward or unchanged', async () => {
    const oldStart = new Date('2026-04-01');
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockInstallment,
      installmentStartDate: oldStart,
      date: oldStart,
    } as any);

    const updatedRow = {
      ...mockInstallment,
      installmentStartDate: new Date('2026-01-01'),
      date: new Date('2026-01-01'),
      account: { id: 'acc-1', name: 'GCash' },
      expenseType: { id: 'type-1', name: 'Electronics' },
      expenseSubcategory: null,
    };
    vi.mocked(db.$transaction).mockResolvedValue([updatedRow] as any);

    const response = await PATCH(
      makePatchRequest({ installmentStartDate: '2026-01-01' }),
      makeParams()
    );

    expect(response.status).toBe(200);

    // findMany for children should not be called (no forward movement)
    expect(db.expenseTransaction.findMany).not.toHaveBeenCalled();
  });

  it('calls onExpenseTransactionChange after update', async () => {
    const updatedRow = {
      ...mockInstallment,
      account: { id: 'acc-1', name: 'GCash' },
      expenseType: { id: 'type-1', name: 'Electronics' },
      expenseSubcategory: null,
    };
    vi.mocked(db.$transaction).mockResolvedValue([updatedRow] as any);

    await PATCH(makePatchRequest({ name: 'Updated Name' }), makeParams());

    expect(onExpenseTransactionChange).toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// DELETE /api/installments/[id]
// -----------------------------------------------------------------------
describe('DELETE /api/installments/[id]', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}] as any);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when installment not found', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('returns 400 when target is not an installment', async () => {
    vi.mocked(db.expenseTransaction.findUnique).mockResolvedValue({
      ...mockInstallment,
      isInstallment: false,
    } as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Not an installment');
  });

  it('reverses balance for every child and deletes parent + children', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      mockChild,
      { ...mockChild, id: 'child-2', amount: 10000 },
    ] as any);

    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}, {}] as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);

    // Should have $transaction called with balance reversals + deleteMany + delete
    const transactionArg = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // 2 children * 1 balance op + deleteMany + delete = 4 ops
    expect(transactionArg.length).toBe(4);
  });

  it('calls onExpenseTransactionChange after delete', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockChild] as any);
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}] as any);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(onExpenseTransactionChange).toHaveBeenCalledWith('acc-1', mockInstallment.date);
  });
});
