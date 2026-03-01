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
      findMany: vi.fn(),
    },
    expenseTransaction: {
      findFirst: vi.fn(),
      groupBy: vi.fn(),
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
  const url = new URL('http://localhost/api/reports/expense-breakdown');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

// Use a past date so future-month checks pass
const VALID_MONTH = '1';
const VALID_YEAR = '2025';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

describe('GET /api/reports/expense-breakdown', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when month param is missing', async () => {
    const response = await GET(makeRequest({ year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required query parameters');
  });

  it('returns 400 when year param is missing', async () => {
    const response = await GET(makeRequest({ month: VALID_MONTH }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required query parameters');
  });

  it('returns 400 for invalid month (out of range)', async () => {
    const response = await GET(makeRequest({ month: '13', year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid month or year');
  });

  it('returns 400 for invalid month (zero)', async () => {
    const response = await GET(makeRequest({ month: '0', year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid month or year');
  });

  it('returns 400 for non-numeric month', async () => {
    const response = await GET(makeRequest({ month: 'abc', year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid month or year');
  });

  it('returns 400 for future month', async () => {
    const response = await GET(makeRequest({ month: '12', year: '9999' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('future months');
  });

  it('returns expense breakdown with correct percentages', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food' } as any,
      { id: 'type-2', name: 'Transport' } as any,
    ]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({
      date: new Date('2025-01-15'),
    } as any);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 600 } } as any,
      { expenseTypeId: 'type-2', _sum: { amount: 400 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.month).toBe(1);
    expect(data.year).toBe(2025);
    expect(data.totalSpent).toBe(1000);
    expect(Array.isArray(data.data)).toBe(true);

    const food = data.data.find((d: any) => d.name === 'Food');
    expect(food.amount).toBe(600);
    expect(food.percentage).toBe(60);

    const transport = data.data.find((d: any) => d.name === 'Transport');
    expect(transport.amount).toBe(400);
    expect(transport.percentage).toBe(40);
  });

  it('excludes expense types with zero spending', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food' } as any,
      { id: 'type-2', name: 'Entertainment' } as any,
    ]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null);
    // Only type-1 has spending
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 500 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe('Food');
  });

  it('sorts results by amount descending', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food' } as any,
      { id: 'type-2', name: 'Transport' } as any,
      { id: 'type-3', name: 'Shopping' } as any,
    ]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 'type-1', _sum: { amount: 300 } } as any,
      { expenseTypeId: 'type-2', _sum: { amount: 100 } } as any,
      { expenseTypeId: 'type-3', _sum: { amount: 600 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.data[0].name).toBe('Shopping');
    expect(data.data[1].name).toBe('Food');
    expect(data.data[2].name).toBe('Transport');
  });

  it('returns earliestMonth and earliestYear from the earliest transaction', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({
      date: new Date('2024-03-10'),
    } as any);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.earliestMonth).toBe(3);
    expect(data.earliestYear).toBe(2024);
  });

  it('returns null for earliestMonth and earliestYear when no transactions exist', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.earliestMonth).toBeNull();
    expect(data.earliestYear).toBeNull();
  });

  it('returns totalSpent of 0 when no spending data', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Food' } as any,
    ]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.totalSpent).toBe(0);
    expect(data.data).toHaveLength(0);
  });

  it('uses groupBy with expenseTypeId and _sum amount', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([]);
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([]);

    await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));

    expect(db.expenseTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['expenseTypeId'],
        _sum: { amount: true },
        where: expect.objectContaining({ isInstallment: false }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    vi.mocked(db.expenseType.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch expense breakdown');
  });
});
