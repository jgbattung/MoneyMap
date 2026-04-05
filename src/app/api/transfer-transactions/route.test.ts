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
    transferTransaction: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    expenseType: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    expenseTransaction: {
      create: vi.fn(),
    },
    financialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/statement-recalculator', () => ({
  onTransferTransactionChange: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockTransfer = {
  id: 'transfer-1',
  userId: 'user-123',
  name: 'Monthly Transfer',
  amount: 500,
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  transferTypeId: 'ttype-1',
  date: new Date('2026-01-15'),
  notes: null,
  feeAmount: null,
  feeExpenseId: null,
};

function makeRequest(url = 'http://localhost/api/transfer-transactions') {
  return new NextRequest(url);
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/transfer-transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPostBody = {
  name: 'Monthly Transfer',
  amount: '500.00',
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  transferTypeId: 'ttype-1',
  date: '2026-01-15',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/transfer-transactions
// -----------------------------------------------------------------------
describe('GET /api/transfer-transactions', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated transfer transactions for authenticated user', async () => {
    vi.mocked(db.transferTransaction.count).mockResolvedValue(1);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([mockTransfer] as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('hasMore');
    expect(data.transactions).toHaveLength(1);
  });

  it('caps take parameter at 100', async () => {
    vi.mocked(db.transferTransaction.count).mockResolvedValue(0);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/transfer-transactions?take=9999'));

    expect(db.transferTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('caps skip parameter at 10000', async () => {
    vi.mocked(db.transferTransaction.count).mockResolvedValue(0);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/transfer-transactions?skip=99999'));

    expect(db.transferTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10000 })
    );
  });

  it('returns empty list when user has no transfer transactions', async () => {
    vi.mocked(db.transferTransaction.count).mockResolvedValue(0);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transactions).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.transferTransaction.count).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/transfer-transactions — batch transaction (Pattern C: pre-generated UUID for fee)
// -----------------------------------------------------------------------
describe('POST /api/transfer-transactions', () => {
  beforeEach(() => {
    // Without fee: batch is [transferTransaction.create, financialAccount.update x2]
    // Results index 0 = transferTransaction
    vi.mocked(db.$transaction).mockResolvedValue([
      {
        ...mockTransfer,
        fromAccount: {},
        toAccount: {},
        transferType: {},
        feeExpense: null,
        tags: [],
      },
      {},
      {},
    ] as any);
  });

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 on success without fee', async () => {
    const response = await POST(makePostRequest(validPostBody));

    expect(response.status).toBe(201);
  });

  it('calls db.$transaction with an array (batch form, not async callback)', async () => {
    await POST(makePostRequest(validPostBody));

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch without fee contains 3 operations [create, fromUpdate, toUpdate]', async () => {
    await POST(makePostRequest(validPostBody));

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('batch WITH fee contains 5 operations [feeCreate, feeAccUpdate, transferCreate, fromUpdate, toUpdate]', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue({ id: 'fee-type-1', name: 'Transfer fee' } as any);
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({ name: 'Checking' } as any);

    const feeTransfer = {
      ...mockTransfer,
      feeAmount: 25,
      feeExpenseId: 'fee-exp-1',
      fromAccount: {},
      toAccount: {},
      transferType: {},
      feeExpense: { id: 'fee-exp-1', amount: 25 },
      tags: [],
    };
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, feeTransfer, {}, {}] as any);

    await POST(makePostRequest({ ...validPostBody, feeAmount: '25' }));

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(5);
  });

  it('creates "Transfer fee" expense type when it does not exist (Pattern D pre-lookup)', async () => {
    vi.mocked(db.expenseType.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseType.create).mockResolvedValue({ id: 'new-fee-type', name: 'Transfer fee' } as any);
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue({ name: 'Checking' } as any);

    const feeTransfer = {
      ...mockTransfer,
      feeAmount: 10,
      feeExpenseId: 'fee-exp-1',
      fromAccount: {},
      toAccount: {},
      transferType: {},
      feeExpense: {},
      tags: [],
    };
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, feeTransfer, {}, {}] as any);

    await POST(makePostRequest({ ...validPostBody, feeAmount: '10' }));

    expect(db.expenseType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Transfer fee' }),
      })
    );
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

  it('returns 400 when fromAccountId is empty', async () => {
    const body = { ...validPostBody, fromAccountId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when toAccountId is empty', async () => {
    const body = { ...validPostBody, toAccountId: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when fromAccountId equals toAccountId', async () => {
    const body = { ...validPostBody, fromAccountId: 'acc-1', toAccountId: 'acc-1' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when transferTypeId is empty', async () => {
    const body = { ...validPostBody, transferTypeId: '' };

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

  it('returns 400 when feeAmount is a non-numeric string', async () => {
    const body = { ...validPostBody, feeAmount: 'abc' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when feeAmount is negative', async () => {
    const body = { ...validPostBody, feeAmount: '-5' };

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

  it('returns 500 when db.$transaction rejects (atomicity)', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(validPostBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
