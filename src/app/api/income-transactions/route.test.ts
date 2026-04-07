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
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
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

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockTransaction = {
  id: 'txn-1',
  userId: 'user-123',
  name: 'Salary',
  amount: 5000,
  accountId: 'acc-1',
  incomeTypeId: 'itype-1',
  date: new Date('2026-01-15'),
  description: null,
};

function makeRequest(url = 'http://localhost/api/income-transactions') {
  return new NextRequest(url);
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/income-transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPostBody = {
  name: 'Salary',
  amount: '5000.00',
  accountId: 'acc-1',
  incomeTypeId: 'itype-1',
  date: '2026-01-15',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/income-transactions
// -----------------------------------------------------------------------
describe('GET /api/income-transactions', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated income transactions for authenticated user', async () => {
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(1);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([mockTransaction] as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('hasMore');
    expect(data.transactions).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('caps take parameter at 100', async () => {
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(0);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/income-transactions?take=500'));

    expect(db.incomeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('caps skip parameter at 10000', async () => {
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(0);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/income-transactions?skip=50000'));

    expect(db.incomeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10000 })
    );
  });

  it('returns hasMore=true when more items remain', async () => {
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(50);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ ...mockTransaction, id: `txn-${i}` })) as any
    );

    const response = await GET(makeRequest('http://localhost/api/income-transactions?take=20&skip=0'));
    const data = await response.json();

    expect(data.hasMore).toBe(true);
  });

  it('returns hasMore=false when all items fetched', async () => {
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(1);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([mockTransaction] as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.hasMore).toBe(false);
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.incomeTransaction.count).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/income-transactions — batch transaction pattern
// -----------------------------------------------------------------------
describe('POST /api/income-transactions', () => {
  beforeEach(() => {
    // Batch transaction: resolves with an array of results.
    // Index 0 = financialAccount.update, index 1 = incomeTransaction.create
    vi.mocked(db.$transaction).mockResolvedValue([
      {},
      { ...mockTransaction, account: {}, incomeType: {}, tags: [] },
    ] as any);
  });

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 with created transaction on success', async () => {
    const response = await POST(makePostRequest(validPostBody));

    expect(response.status).toBe(201);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Array));
  });

  it('calls db.$transaction with an array (batch form, not async callback)', async () => {
    await POST(makePostRequest(validPostBody));

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('returns 400 when name is empty', async () => {
    const body = { ...validPostBody, name: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('returns 400 when amount is zero', async () => {
    const body = { ...validPostBody, amount: '0' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when amount is negative', async () => {
    const body = { ...validPostBody, amount: '-100' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when amount is non-numeric', async () => {
    const body = { ...validPostBody, amount: 'not-a-number' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when accountId is empty', async () => {
    const body = { ...validPostBody, accountId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when incomeTypeId is empty', async () => {
    const body = { ...validPostBody, incomeTypeId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when date is empty', async () => {
    const body = { ...validPostBody, date: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when body is entirely empty', async () => {
    const response = await POST(makePostRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when name exceeds 100 characters', async () => {
    const body = { ...validPostBody, name: 'N'.repeat(101) };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when description exceeds 500 characters', async () => {
    const body = { ...validPostBody, description: 'D'.repeat(501) };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 500 when db.$transaction rejects (atomicity: batch fails as a unit)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
