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
      aggregate: vi.fn(),
    },
    expenseTransaction: {
      aggregate: vi.fn(),
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

function makeRequest(url = 'http://localhost/api/dashboard/monthly-summary') {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

describe('GET /api/dashboard/monthly-summary', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns current and last month summary with correct calculations', async () => {
    vi.mocked(db.incomeTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 5000 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 4000 } } as any);

    vi.mocked(db.expenseTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 3000 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 2000 } } as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('currentMonth');
    expect(data).toHaveProperty('lastMonth');

    expect(data.currentMonth.income).toBe(5000);
    expect(data.currentMonth.expenses).toBe(3000);
    expect(data.currentMonth.savings).toBe(2000);

    expect(data.lastMonth.income).toBe(4000);
    expect(data.lastMonth.expenses).toBe(2000);
    expect(data.lastMonth.savings).toBe(2000);
  });

  it('handles null aggregate sums (no transactions) by returning zeros', async () => {
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: null } } as any);
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: null } } as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentMonth.income).toBe(0);
    expect(data.currentMonth.expenses).toBe(0);
    expect(data.currentMonth.savings).toBe(0);
    expect(data.lastMonth.income).toBe(0);
    expect(data.lastMonth.expenses).toBe(0);
    expect(data.lastMonth.savings).toBe(0);
  });

  it('rounds values to 2 decimal places', async () => {
    vi.mocked(db.incomeTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 1000.999 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);
    vi.mocked(db.expenseTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 500.555 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentMonth.income).toBe(1001);
    expect(data.currentMonth.expenses).toBe(500.56);
    expect(data.currentMonth.savings).toBe(500.44);
  });

  it('calls aggregate with isInstallment: false for expenses', async () => {
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);

    await GET(makeRequest());

    const expenseCalls = vi.mocked(db.expenseTransaction.aggregate).mock.calls;
    expect(expenseCalls).toHaveLength(2);
    expenseCalls.forEach((call) => {
      expect(call[0].where).toMatchObject({ isInstallment: false });
    });
  });

  it('calls aggregate with userId from session', async () => {
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);

    await GET(makeRequest());

    const incomeCalls = vi.mocked(db.incomeTransaction.aggregate).mock.calls;
    expect(incomeCalls).toHaveLength(2);
    incomeCalls.forEach((call) => {
      expect(call[0].where).toMatchObject({ userId: 'user-123' });
    });
  });

  it('calls all 4 aggregates (2 income + 2 expense) in parallel', async () => {
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: 100 } } as any);
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: 50 } } as any);

    await GET(makeRequest());

    expect(db.incomeTransaction.aggregate).toHaveBeenCalledTimes(2);
    expect(db.expenseTransaction.aggregate).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when a database error occurs', async () => {
    vi.mocked(db.incomeTransaction.aggregate).mockRejectedValue(new Error('DB failure'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch monthly summary');
  });

  it('calculates negative savings when expenses exceed income', async () => {
    vi.mocked(db.incomeTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 1000 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);
    vi.mocked(db.expenseTransaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 2000 } } as any)
      .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentMonth.savings).toBe(-1000);
  });
});
