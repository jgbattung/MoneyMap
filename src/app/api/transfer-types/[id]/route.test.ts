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
    transferType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    transferTransaction: {
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

const mockTransferType = {
  id: 'ttype-1',
  userId: 'user-123',
  name: 'Internal Transfer',
};

function makePatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/transfer-types/ttype-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/transfer-types/ttype-1', {
    method: 'DELETE',
  });
}

function makeParams(id = 'ttype-1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.transferType.findUnique).mockResolvedValue(mockTransferType as any);
  vi.mocked(db.transferType.findFirst).mockResolvedValue({ id: 'uncategorized-1', name: 'Uncategorized' } as any);
});

// -----------------------------------------------------------------------
// PATCH /api/transfer-types/[id]
// -----------------------------------------------------------------------
describe('PATCH /api/transfer-types/[id]', () => {
  beforeEach(() => {
    vi.mocked(db.transferType.update).mockResolvedValue({
      ...mockTransferType,
      name: 'Updated Name',
    } as any);
  });

  it('returns 200 on success', async () => {
    const response = await PATCH(makePatchRequest({ name: 'Wire Transfer' }), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns updated transfer type', async () => {
    const response = await PATCH(makePatchRequest({ name: 'Wire Transfer' }), makeParams());
    const data = await response.json();

    expect(data).toHaveProperty('name');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'Wire Transfer' }), makeParams());
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
    vi.mocked(db.transferType.update).mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    );

    const response = await PATCH(makePatchRequest({ name: 'Wire Transfer' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A transfer type with this name already exists');
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.transferType.update).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest({ name: 'Wire Transfer' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/transfer-types/[id] — batch transaction (Pattern D)
// -----------------------------------------------------------------------
describe('DELETE /api/transfer-types/[id] — batch transaction form', () => {
  beforeEach(() => {
    // Batch: [transferTransaction.updateMany, transferType.delete]
    vi.mocked(db.$transaction).mockResolvedValue([{ count: 2 }, {}] as any);
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
    expect(data.message).toBe('Transfer type deleted successfully');
    expect(data.reassignedCount).toBe(2);
  });

  it('batch contains [transferTransaction.updateMany, transferType.delete]', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });

  it('finds "Uncategorized" type before the transaction (Pattern D)', async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.transferType.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
    expect(db.transferType.create).not.toHaveBeenCalled();
  });

  it('creates "Uncategorized" transfer type when not found (Pattern D idempotent create)', async () => {
    vi.mocked(db.transferType.findFirst).mockResolvedValue(null);
    vi.mocked(db.transferType.create).mockResolvedValue({ id: 'new-uncategorized', name: 'Uncategorized' } as any);

    await DELETE(makeDeleteRequest(), makeParams());

    expect(db.transferType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Uncategorized' }),
      })
    );
  });

  it('returns 400 when trying to delete "Uncategorized" transfer type', async () => {
    vi.mocked(db.transferType.findUnique).mockResolvedValue({
      ...mockTransferType,
      name: 'Uncategorized',
    } as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete the Uncategorized transfer type');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when transfer type not found', async () => {
    vi.mocked(db.transferType.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Transfer type not found');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
