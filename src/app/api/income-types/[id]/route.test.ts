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
    incomeType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    incomeTransaction: {
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

const mockIncomeType = {
  id: 'itype-1',
  userId: 'user-123',
  name: 'Salary',
  monthlyTarget: 5000,
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/income-types/itype-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/income-types/itype-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'itype-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.incomeType.findUnique).mockResolvedValue(mockIncomeType as any);
  vi.mocked(db.incomeType.findFirst).mockResolvedValue({ id: 'uncategorized-1', name: 'Uncategorized' } as any);
});

// -----------------------------------------------------------------------
// PATCH /api/income-types/[id]
// -----------------------------------------------------------------------
describe('PATCH /api/income-types/[id]', () => {
  beforeEach(() => {
    vi.mocked(db.incomeType.update).mockResolvedValue({
      ...mockIncomeType,
      name: 'Freelance',
    } as any);
  });

  it('returns 200 on success', async () => {
    const response = await PATCH(makePatchRequest({ name: 'Freelance', monthlyTarget: '3000' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns updated income type', async () => {
    const response = await PATCH(makePatchRequest({ name: 'Freelance' }), makeParams());
    const data = await response.json();

    expect(data).toHaveProperty('name');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'Freelance' }), makeParams());
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
    vi.mocked(db.incomeType.update).mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    );

    const response = await PATCH(makePatchRequest({ name: 'Freelance' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('An income type with this name already exists');
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.incomeType.update).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ name: 'Freelance' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/income-types/[id] — batch transaction (Pattern D)
// -----------------------------------------------------------------------
describe('DELETE /api/income-types/[id] — batch transaction form', () => {
  beforeEach(() => {
    // Batch: [incomeTransaction.updateMany, incomeType.delete]
    vi.mocked(db.$transaction).mockResolvedValue([{ count: 5 }, {}] as any);
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
    expect(data.message).toBe('Income type deleted successfully');
    expect(data.reassignedCount).toBe(5);
  });

  it('batch contains [incomeTransaction.updateMany, incomeType.delete]', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });

  it('finds "Uncategorized" type before the transaction (Pattern D)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.incomeType.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
    expect(db.incomeType.create).not.toHaveBeenCalled();
  });

  it('creates "Uncategorized" income type when not found (Pattern D idempotent create)', async () => {
    vi.mocked(db.incomeType.findFirst).mockResolvedValue(null);
    vi.mocked(db.incomeType.create).mockResolvedValue({ id: 'new-uncategorized', name: 'Uncategorized' } as any);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.incomeType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
  });

  it('returns 400 when trying to delete "Uncategorized" income type', async () => {
    vi.mocked(db.incomeType.findUnique).mockResolvedValue({
      ...mockIncomeType,
      name: 'Uncategorized',
    } as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete the Uncategorized income type');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when income type not found', async () => {
    vi.mocked(db.incomeType.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Income type not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
