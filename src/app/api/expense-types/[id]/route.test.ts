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
    expenseType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    expenseSubcategory: {
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    expenseTransaction: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { PATCH, DELETE } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockExpenseType = {
  id: 'etype-1',
  userId: 'user-123',
  name: 'Food',
  monthlyBudget: 500,
  isSystem: false,
  subcategories: [],
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/expense-types/etype-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/expense-types/etype-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'etype-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseType.findUnique).mockResolvedValue(mockExpenseType as any);
  vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'uncategorized-1', name: 'Uncategorized' } as any);
});

// -----------------------------------------------------------------------
// PATCH /api/expense-types/[id] — batch transaction (Pattern E: dynamic ops array)
// -----------------------------------------------------------------------
describe('PATCH /api/expense-types/[id] — batch transaction form', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockResolvedValue([mockExpenseType] as any);
    vi.mocked(db.expenseType.findUnique).mockResolvedValueOnce(mockExpenseType as any) // first call (re-read)
                                        .mockResolvedValue({ ...mockExpenseType, subcategories: [] } as any);
  });

  it('calls db.$transaction with an array (batch form, Pattern E)', async () => {
    await PATCH(makePatchRequest({ name: 'Food & Drinks' }), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('returns 200 on success', async () => {
    const response = await PATCH(makePatchRequest({ name: 'Food & Drinks' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('batch contains only expenseType.update when no subcategoryChanges provided', async () => {
    await PATCH(makePatchRequest({ name: 'Food & Drinks' }), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(1);
  });

  it('batch contains expenseType.update + createMany when toCreate provided', async () => {
    const body = {
      name: 'Food',
      subcategoryChanges: {
        toCreate: [{ name: 'Breakfast' }, { name: 'Lunch' }],
        toUpdate: [],
        toDelete: [],
      },
    };

    await PATCH(makePatchRequest(body), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [expenseType.update, expenseSubcategory.createMany]
    expect(callArg).toHaveLength(2);
  });

  it('batch includes individual update calls for each item in toUpdate (Pattern E)', async () => {
    const body = {
      name: 'Food',
      subcategoryChanges: {
        toCreate: [],
        toUpdate: [{ id: 'sub-1', name: 'Morning Breakfast' }, { id: 'sub-2', name: 'Quick Lunch' }],
        toDelete: [],
      },
    };

    await PATCH(makePatchRequest(body), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [expenseType.update, sub1Update, sub2Update]
    expect(callArg).toHaveLength(3);
  });

  it('batch includes deleteMany for toDelete items', async () => {
    const body = {
      name: 'Food',
      subcategoryChanges: {
        toCreate: [],
        toUpdate: [],
        toDelete: ['sub-1', 'sub-2'],
      },
    };

    await PATCH(makePatchRequest(body), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [expenseType.update, expenseSubcategory.deleteMany]
    expect(callArg).toHaveLength(2);
  });

  it('batch contains all four op types when toCreate + toUpdate + toDelete all provided', async () => {
    const body = {
      name: 'Food',
      subcategoryChanges: {
        toCreate: [{ name: 'Dinner' }],
        toUpdate: [{ id: 'sub-1', name: 'Renamed' }],
        toDelete: ['sub-2'],
      },
    };

    await PATCH(makePatchRequest(body), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    // [expenseType.update, createMany, sub1.update, deleteMany]
    expect(callArg).toHaveLength(4);
  });
});

describe('PATCH /api/expense-types/[id] — auth and error paths', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'Food' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    const response = await PATCH(makePatchRequest({}), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 409 when name already exists (P2002)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    const response = await PATCH(makePatchRequest({ name: 'Food' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('An expense type with this name already exists');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ name: 'Food' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/expense-types/[id] — batch transaction (Pattern D: find-or-create Uncategorized)
// -----------------------------------------------------------------------
describe('DELETE /api/expense-types/[id] — batch transaction form', () => {
  beforeEach(() => {
    // Batch: [expenseTransaction.updateMany, expenseType.delete]
    vi.mocked(db.$transaction).mockResolvedValue([{ count: 3 }, {}] as any);
  });

  it('calls db.$transaction with an array (batch form, Pattern D)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('returns 200 with reassignedCount on success', async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('reassignedCount');
    expect(data.reassignedCount).toBe(3);
  });

  it('batch contains [expenseTransaction.updateMany, expenseType.delete]', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });

  it('finds "Uncategorized" type before the transaction (Pattern D)', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'uncategorized-1' } as any);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.expenseType.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
    expect(db.expenseType.create).not.toHaveBeenCalled();
  });

  it('creates "Uncategorized" type when not found (Pattern D idempotent create)', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseType.create).mockResolvedValue({ id: 'new-uncategorized', name: 'Uncategorized' } as any);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.expenseType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
  });

  it('returns 400 when trying to delete "Uncategorized" expense type', async () => {
    vi.mocked(db.expenseType.findUnique).mockResolvedValue({
      ...mockExpenseType,
      name: 'Uncategorized',
    } as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete Uncategorized expense type');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when expense type not found', async () => {
    vi.mocked(db.expenseType.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Expense type not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
