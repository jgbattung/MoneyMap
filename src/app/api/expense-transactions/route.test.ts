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
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makeRequest(url = 'http://localhost/api/expense-transactions') {
  return new NextRequest(url);
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/expense-transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPostBody = {
  name: 'Groceries',
  amount: '50.00',
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  date: '2026-01-15',
  isInstallment: false,
};

const mockTransaction = {
  id: 'txn-1',
  userId: 'user-123',
  name: 'Groceries',
  amount: 50,
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  date: new Date('2026-01-15'),
  isInstallment: false,
  isSystemGenerated: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/expense-transactions
// -----------------------------------------------------------------------
describe('GET /api/expense-transactions', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated transactions for authenticated user', async () => {
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(1);
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockTransaction] as any);

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
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(0);
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/expense-transactions?take=9999'));

    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('caps skip parameter at 10000', async () => {
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(0);
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/expense-transactions?skip=99999'));

    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10000,
      })
    );
  });

  it('always filters by isInstallment: false', async () => {
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(0);
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest());

    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isInstallment: false,
        }),
      })
    );
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.expenseTransaction.count).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/expense-transactions
// -----------------------------------------------------------------------
describe('POST /api/expense-transactions', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => {
      return fn({
        expenseTransaction: {
          create: vi.fn().mockResolvedValue(mockTransaction),
          update: vi.fn().mockResolvedValue(mockTransaction),
        },
        financialAccount: {
          update: vi.fn().mockResolvedValue({}),
        },
      });
    });
  });

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
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
    const body = { ...validPostBody, amount: '-10' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when amount is non-numeric', async () => {
    const body = { ...validPostBody, amount: 'abc' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when accountId is missing', async () => {
    const body = { ...validPostBody, accountId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when expenseTypeId is missing', async () => {
    const body = { ...validPostBody, expenseTypeId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when date is missing for non-installment expense', async () => {
    const { date: _removed, ...body } = validPostBody;

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Date is required for regular expenses');
  });

  it('returns 400 when isInstallment is true but installmentDuration is missing', async () => {
    const body = {
      ...validPostBody,
      isInstallment: true,
      installmentStartDate: '2026-01-15',
    };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Installment duration and start date are required for installment expenses');
  });

  it('returns 400 when isInstallment is true but installmentStartDate is missing', async () => {
    const body = {
      ...validPostBody,
      isInstallment: true,
      installmentDuration: 12,
    };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Installment duration and start date are required for installment expenses');
  });

  it('returns 400 when body is empty', async () => {
    const response = await POST(makePostRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 500 when database $transaction throws', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
