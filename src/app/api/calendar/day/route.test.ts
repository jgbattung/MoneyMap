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
      findMany: vi.fn(),
    },
    incomeTransaction: {
      findMany: vi.fn(),
    },
    transferTransaction: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/calendar/day');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const expenseRow = {
  id: 'exp-1',
  name: 'Groceries',
  amount: '120.50',
  date: new Date('2026-07-29T08:00:00.000Z'),
  account: { name: 'Main Checking' },
  expenseType: { name: 'Food' },
  expenseSubcategory: { name: 'Groceries' },
  tags: [],
};

const incomeRow = {
  id: 'inc-1',
  name: 'Salary',
  amount: '50000.00',
  date: new Date('2026-07-29T00:00:00.000Z'),
  account: { name: 'Main Checking' },
  incomeType: { name: 'Salary' },
  tags: [],
};

const transferRow = {
  id: 'trf-1',
  name: 'Move to savings',
  amount: 1000,
  date: new Date('2026-07-29T09:00:00.000Z'),
  fromAccount: { name: 'Main Checking' },
  toAccount: { name: 'Savings' },
  transferType: { name: 'Internal' },
  tags: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([]);
  vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([]);
  vi.mocked(db.transferTransaction.findMany).mockResolvedValue([]);
});

describe('GET /api/calendar/day', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for a malformed date', async () => {
    const response = await GET(makeRequest({ date: '07-29-2026' }));

    expect(response.status).toBe(400);
  });

  it('returns 400 for a missing date', async () => {
    const response = await GET(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it('returns all three transaction types with correct type values and populated relation names', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow] as any);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([incomeRow] as any);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow] as any);

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transactions).toHaveLength(3);

    const expense = data.transactions.find((t: any) => t.type === 'EXPENSE');
    expect(expense).toMatchObject({
      id: 'exp-1',
      amount: 120.5,
      categoryName: 'Food',
      subcategoryName: 'Groceries',
      accountName: 'Main Checking',
    });

    const income = data.transactions.find((t: any) => t.type === 'INCOME');
    expect(income).toMatchObject({
      id: 'inc-1',
      amount: 50000,
      categoryName: 'Salary',
      accountName: 'Main Checking',
    });

    const transfer = data.transactions.find((t: any) => t.type === 'TRANSFER');
    expect(transfer).toMatchObject({
      id: 'trf-1',
      amount: 1000,
      categoryName: 'Internal',
      accountName: 'Main Checking',
      toAccountName: 'Savings',
    });
  });

  it('sorts transactions date-desc', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow] as any); // 08:00
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([incomeRow] as any); // 00:00
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow] as any); // 09:00

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(data.transactions.map((t: any) => t.id)).toEqual(['trf-1', 'exp-1', 'inc-1']);
  });

  it('computes totals from income and expense only, excluding transfers', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow] as any);
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([incomeRow] as any);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow] as any);

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(data.totals).toEqual({ income: 50000, expense: 120.5, net: 49879.5 });
  });

  it('does not filter out a fee-bearing transfer\'s linked "Transfer fee" expense row', async () => {
    const feeExpense = {
      ...expenseRow,
      id: 'fee-1',
      name: 'Transfer fee: Move to savings',
      amount: '15.00',
    };
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow, feeExpense] as any);
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow] as any);

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    // Both the transfer and its fee expense show up as separate rows.
    expect(data.transactions.filter((t: any) => t.id === 'fee-1')).toHaveLength(1);
    expect(data.transactions.filter((t: any) => t.id === 'trf-1')).toHaveLength(1);
  });

  it('returns an empty array and zeroed totals for a day with no transactions', async () => {
    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transactions).toEqual([]);
    expect(data.totals).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('filters expenses with isInstallment: false', async () => {
    await GET(makeRequest({ date: '2026-07-29' }));

    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isInstallment: false }),
      })
    );
  });

  it('caps each query at take: 100', async () => {
    await GET(makeRequest({ date: '2026-07-29' }));

    expect(db.expenseTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
    expect(db.incomeTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
    expect(db.transferTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('returns 500 on database error', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest({ date: '2026-07-29' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch calendar day');
  });
});
