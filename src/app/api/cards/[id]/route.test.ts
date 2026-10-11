/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

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
    financialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    incomeTransaction: {
      count: vi.fn(),
    },
    expenseTransaction: {
      count: vi.fn(),
    },
    transferTransaction: {
      count: vi.fn(),
    },
  },
}));

import { PATCH } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockCard = {
  id: 'card-1',
  userId: 'user-123',
  name: 'Visa',
  accountType: 'CREDIT_CARD',
  initialBalance: -2000,
  currentBalance: -2000,
  statementDate: 5,
  dueDate: 25,
  cardGroup: null,
};

function makeParams(id = 'card-1') {
  return { params: Promise.resolve({ id }) };
}

function makePatchRequest(body: unknown, id = 'card-1') {
  return new NextRequest(`http://localhost/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// PATCH /api/cards/[id]
// -----------------------------------------------------------------------
describe('PATCH /api/cards/[id]', () => {
  const validBody = {
    name: 'Renamed Visa',
    initialBalance: '-2000',
    statementDate: 5,
    dueDate: 25,
  };

  function mockStored(value: string) {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({
      initialBalance: new Prisma.Decimal(value),
    } as any);
  }

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when initialBalance is non-numeric', async () => {
    const response = await PATCH(makePatchRequest({ ...validBody, initialBalance: 'abc' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 200 with the updated card on valid input', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue({ ...mockCard, name: 'Renamed Visa' } as any);

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Renamed Visa');
  });

  it('does not send currentBalance on a name-only edit', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue(mockCard as any);

    await PATCH(makePatchRequest(validBody), makeParams());

    const args = vi.mocked(db.financialAccount.update).mock.calls[0][0] as any;
    expect(args.data).not.toHaveProperty('currentBalance');
    expect(args.data.name).toBe('Renamed Visa');
    expect(args.data.accountType).toBe('CREDIT_CARD');
    expect(args.data.cardGroup).toBeNull();
    expect(args.data.initialBalance.toString()).toBe('-2000');
    expect(args.where.id).toBe('card-1');
    expect(args.where.userId).toBe('user-123');
    expect(args.where.initialBalance.toString()).toBe('-2000');
  });

  it('keeps a provided cardGroup', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue(mockCard as any);

    await PATCH(makePatchRequest({ ...validBody, cardGroup: 'Family' }), makeParams());

    const args = vi.mocked(db.financialAccount.update).mock.calls[0][0] as any;
    expect(args.data.cardGroup).toBe('Family');
  });

  it('increments currentBalance by -500 when the opening balance moves from -2000 to -2500', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue(mockCard as any);

    await PATCH(makePatchRequest({ ...validBody, initialBalance: '-2500' }), makeParams());

    const args = vi.mocked(db.financialAccount.update).mock.calls[0][0] as any;
    expect(args.data.currentBalance.increment.toString()).toBe('-500');
    expect(args.data.initialBalance.toString()).toBe('-2500');
    expect(args.where.initialBalance.toString()).toBe('-2000');
  });

  it('increments currentBalance by a positive delta when the debt shrinks', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue(mockCard as any);

    await PATCH(makePatchRequest({ ...validBody, initialBalance: '-1500.50' }), makeParams());

    const args = vi.mocked(db.financialAccount.update).mock.calls[0][0] as any;
    expect(args.data.currentBalance.increment.toString()).toBe('499.5');
  });

  it('treats a positive stored opening balance sent back unchanged as a zero delta', async () => {
    mockStored('300.00');
    vi.mocked(db.financialAccount.update).mockResolvedValue(mockCard as any);

    await PATCH(makePatchRequest({ ...validBody, initialBalance: '300' }), makeParams());

    const args = vi.mocked(db.financialAccount.update).mock.calls[0][0] as any;
    expect(args.data).not.toHaveProperty('currentBalance');
  });

  it('returns 404 and does not update when the card does not exist', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Credit card not found');
    expect(db.financialAccount.update).not.toHaveBeenCalled();
  });

  it('returns 409 when the conditional update loses a race (P2025)', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' })
    );

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/changed by another request/);
  });

  it('returns 500 when the database throws', async () => {
    mockStored('-2000.00');
    vi.mocked(db.financialAccount.update).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
