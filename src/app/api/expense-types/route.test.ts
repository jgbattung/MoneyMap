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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    expenseSubcategory: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, POST } from './route';
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

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/expense-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPostBody = {
  name: 'Food',
  monthlyBudget: '500',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/expense-types
// -----------------------------------------------------------------------
describe('GET /api/expense-types', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns expense types list for authenticated user', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'fee-type-1' } as any);
    vi.mocked(db.expenseType.findMany).mockResolvedValue([mockExpenseType] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
  });

  it('creates "Transfer fee" type if it does not exist (idempotent pre-lookup)', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseType.create).mockResolvedValue({ id: 'new-fee-type' } as any);
    vi.mocked(db.expenseType.findMany).mockResolvedValue([mockExpenseType] as any);

    await GET();

    expect(db.expenseType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Transfer fee', isSystem: true }),
      })
    );
  });

  it('does not create "Transfer fee" type when it already exists', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'existing-fee-type' } as any);
    vi.mocked(db.expenseType.findMany).mockResolvedValue([mockExpenseType] as any);

    await GET();

    expect(db.expenseType.create).not.toHaveBeenCalled();
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.expenseType.findFirst).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/expense-types — batch transaction (Pattern C: pre-generated UUID)
// -----------------------------------------------------------------------
describe('POST /api/expense-types', () => {
  beforeEach(() => {
    // Batch contains [expenseType.create] or [expenseType.create, expenseSubcategory.createMany]
    vi.mocked(db.$transaction).mockResolvedValue([mockExpenseType, {}] as any);
    vi.mocked(db.expenseType.findUnique).mockResolvedValue({
      ...mockExpenseType,
      subcategories: [],
    } as any);
  });

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 on success', async () => {
    const response = await POST(makePostRequest(validPostBody));

    expect(response.status).toBe(201);
  });

  it('calls db.$transaction with an array (batch form, Pattern C)', async () => {
    await POST(makePostRequest(validPostBody));

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch contains only expenseType.create when no subcategories provided', async () => {
    vi.mocked(db.$transaction).mockResolvedValue([mockExpenseType] as any);

    await POST(makePostRequest(validPostBody));

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(1);
  });

  it('batch contains expenseType.create + expenseSubcategory.createMany when subcategories provided', async () => {
    const body = { ...validPostBody, subcategories: [{ name: 'Breakfast' }, { name: 'Lunch' }] };

    await POST(makePostRequest(body));

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(2);
  });

  it('returns 201 with result read outside the transaction (re-read pattern)', async () => {
    const createdType = { ...mockExpenseType, subcategories: [{ id: 'sub-1', name: 'Breakfast' }] };
    vi.mocked(db.expenseType.findUnique).mockResolvedValue(createdType as any);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(makePostRequest({ monthlyBudget: '500' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('returns 400 when name exceeds 50 characters', async () => {
    const response = await POST(makePostRequest({ name: 'N'.repeat(51) }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when monthlyBudget is non-numeric', async () => {
    const response = await POST(makePostRequest({ name: 'Food', monthlyBudget: 'abc' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when body is empty', async () => {
    const response = await POST(makePostRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 409 when expense type name already exists (P2002)', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    vi.mocked(db.$transaction).mockRejectedValue(p2002Error);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('An expense type with this name already exists');
  });

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
