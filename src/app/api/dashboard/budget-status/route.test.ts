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

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return { db: mockDeep() };
});

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { mockReset } from 'vitest-mock-extended';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makeRequest(url = 'http://localhost/api/dashboard/budget-status') {
  return new NextRequest(url);
}

beforeEach(() => {
  mockReset(db as any);
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

describe('GET /api/dashboard/budget-status', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns budget status combining expense types with groupBy spending', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food', monthlyBudget: 500 } as any,
      { id: 'type-2', name: 'Transport', monthlyBudget: 200 } as any,
    ]);

    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 300 } } as any,
      { expenseTypeId: 'type-2', _sum: { amount: 250 } } as any,
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('budgets');
    expect(Array.isArray(data.budgets)).toBe(true);

    const food = data.budgets.find((b: any) => b.name === 'Food');
    expect(food).toBeDefined();
    expect(food.spentAmount).toBe(300);
    expect(food.monthlyBudget).toBe(500);
    expect(food.progressPercentage).toBe(60);
    expect(food.isOverBudget).toBe(false);

    const transport = data.budgets.find((b: any) => b.name === 'Transport');
    expect(transport).toBeDefined();
    expect(transport.spentAmount).toBe(250);
    expect(transport.isOverBudget).toBe(true);
  });

  it('marks budget as over-budget when spentAmount exceeds monthlyBudget', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food', monthlyBudget: 100 } as any,
    ]);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 150 } } as any,
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.budgets[0].isOverBudget).toBe(true);
    expect(data.budgets[0].progressPercentage).toBe(150);
  });

  it('handles expense types with no spending (not in groupBy result)', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food', monthlyBudget: 500 } as any,
      { id: 'type-2', name: 'Entertainment', monthlyBudget: 100 } as any,
    ]);
    // type-2 has no transactions this month
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 200 } } as any,
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    const entertainment = data.budgets.find((b: any) => b.name === 'Entertainment');
    expect(entertainment).toBeDefined();
    expect(entertainment.spentAmount).toBe(0);
    expect(entertainment.progressPercentage).toBe(0);
    expect(entertainment.isOverBudget).toBe(false);
  });

  it('handles null monthlyBudget (no budget set)', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Misc', monthlyBudget: null } as any,
    ]);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 100 } } as any,
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    const misc = data.budgets.find((b: any) => b.name === 'Misc');
    expect(misc.monthlyBudget).toBeNull();
    expect(misc.progressPercentage).toBe(0);
    expect(misc.isOverBudget).toBe(false);
  });

  it('returns at most 5 budgets sorted by spentAmount descending', async () => {
    const expenseTypes = Array.from({ length: 7 }, (_, i) => ({
      id: `type-${i}`,
      name: `Type ${i}`,
      monthlyBudget: 1000,
    }));
    vi.mocked(db.expenseType.findMany).mockResolvedValue(expenseTypes as any);

    const groups = expenseTypes.map((t, i) => ({
      expenseTypeId: t.id,
      _sum: { amount: (i + 1) * 100 },
    }));
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue(groups as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.budgets).toHaveLength(5);
    // Sorted descending: 700, 600, 500, 400, 300
    expect(data.budgets[0].spentAmount).toBe(700);
    expect(data.budgets[4].spentAmount).toBe(300);
  });

  it('returns empty budgets array when user has no expense types', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.budgets).toEqual([]);
  });

  it('uses groupBy with isInstallment: false filter', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    await GET(makeRequest());

    expect(db.expenseTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isInstallment: false }),
      })
    );
  });

  it('groups by expenseTypeId with _sum amount', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    await GET(makeRequest());

    expect(db.expenseTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['expenseTypeId'],
        _sum: { amount: true },
      })
    );
  });

  it('returns 500 when a database error occurs', async () => {
    vi.mocked(db.expenseType.findMany).mockRejectedValue(new Error('DB failure'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch budget status');
  });
});
