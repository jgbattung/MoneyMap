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
    incomeType: {
      findMany: vi.fn(),
    },
    incomeTransaction: {
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
  const url = new URL('http://localhost/api/reports/income-breakdown');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const VALID_MONTH = '1';
const VALID_YEAR = '2025';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

describe('GET /api/reports/income-breakdown', () => {
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

  it('returns 400 for invalid month (out of range high)', async () => {
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

  it('returns income breakdown with correct percentages', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Salary' } as any,
      { id: 'type-2', name: 'Freelance' } as any,
    ]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue({
      date: new Date('2025-01-05'),
    } as any);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([
      { incomeTypeId: 'type-1', _sum: { amount: 4000 } } as any,
      { incomeTypeId: 'type-2', _sum: { amount: 1000 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.month).toBe(1);
    expect(data.year).toBe(2025);
    expect(data.totalEarned).toBe(5000);
    expect(Array.isArray(data.data)).toBe(true);

    const salary = data.data.find((d: any) => d.name === 'Salary');
    expect(salary.amount).toBe(4000);
    expect(salary.percentage).toBe(80);

    const freelance = data.data.find((d: any) => d.name === 'Freelance');
    expect(freelance.amount).toBe(1000);
    expect(freelance.percentage).toBe(20);
  });

  it('excludes income types with zero earnings', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Salary' } as any,
      { id: 'type-2', name: 'Rental' } as any,
    ]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue(null);
    // Only type-1 has earnings this month
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([
      { incomeTypeId: 'type-1', _sum: { amount: 3000 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe('Salary');
  });

  it('sorts results by amount descending', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Salary' } as any,
      { id: 'type-2', name: 'Freelance' } as any,
      { id: 'type-3', name: 'Bonus' } as any,
    ]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([
      { incomeTypeId: 'type-1', _sum: { amount: 3000 } } as any,
      { incomeTypeId: 'type-2', _sum: { amount: 500 } } as any,
      { incomeTypeId: 'type-3', _sum: { amount: 1000 } } as any,
    ]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.data[0].name).toBe('Salary');
    expect(data.data[1].name).toBe('Bonus');
    expect(data.data[2].name).toBe('Freelance');
  });

  it('returns earliestMonth and earliestYear from the earliest transaction', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue({
      date: new Date('2024-06-01'),
    } as any);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.earliestMonth).toBe(6);
    expect(data.earliestYear).toBe(2024);
  });

  it('returns null for earliestMonth and earliestYear when no transactions', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.earliestMonth).toBeNull();
    expect(data.earliestYear).toBeNull();
  });

  it('returns totalEarned of 0 when no earnings data', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'Salary' } as any,
    ]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([]);

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(data.totalEarned).toBe(0);
    expect(data.data).toHaveLength(0);
  });

  it('uses groupBy with incomeTypeId and _sum amount', async () => {
    vi.mocked(db.incomeType.findMany).mockResolvedValue([]);
    vi.mocked(db.incomeTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([]);

    await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));

    expect(db.incomeTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['incomeTypeId'],
        _sum: { amount: true },
      })
    );
  });

  it('returns 500 on database error', async () => {
    vi.mocked(db.incomeType.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest({ month: VALID_MONTH, year: VALID_YEAR }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch income breakdown');
  });
});
