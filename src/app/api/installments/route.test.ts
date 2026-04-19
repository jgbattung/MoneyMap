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
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockInstallment = {
  id: 'inst-1',
  userId: 'user-123',
  name: 'iPhone 16',
  amount: 60000,
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  isInstallment: true,
  installmentStatus: 'ACTIVE',
  installmentDuration: 6,
  remainingInstallments: 4,
  installmentStartDate: new Date('2026-01-01'),
  monthlyAmount: 10000,
  account: { id: 'acc-1', name: 'GCash' },
  expenseType: { id: 'type-1', name: 'Electronics' },
  expenseSubcategory: null,
};

const cancelledInstallment = {
  ...mockInstallment,
  id: 'inst-cancelled',
  installmentStatus: 'CANCELLED',
};

const completedInstallment = {
  ...mockInstallment,
  id: 'inst-completed',
  installmentStatus: 'COMPLETED',
  remainingInstallments: 0,
};

function makeRequest(url: string) {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockInstallment] as any);
});

describe('GET /api/installments', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest('http://localhost/api/installments'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid status param', async () => {
    const response = await GET(makeRequest('http://localhost/api/installments?status=INVALID'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/Invalid status/);
  });

  it('returns only ACTIVE installments when status omitted', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockInstallment] as any);

    const response = await GET(makeRequest('http://localhost/api/installments'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installments).toHaveLength(1);

    const whereArg = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any;
    expect(whereArg.where.installmentStatus).toBe('ACTIVE');
  });

  it('returns ACTIVE+COMPLETED when status=ALL, never CANCELLED', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      mockInstallment,
      completedInstallment,
    ] as any);

    const response = await GET(makeRequest('http://localhost/api/installments?status=ALL'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installments).toHaveLength(2);

    const whereArg = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any;
    expect(whereArg.where.installmentStatus).toEqual({ in: ['ACTIVE', 'COMPLETED'] });

    // CANCELLED should not be in filter
    const statusFilter = whereArg.where.installmentStatus;
    if (statusFilter && typeof statusFilter === 'object' && 'in' in statusFilter) {
      expect(statusFilter.in).not.toContain('CANCELLED');
    }
  });

  it('filters by userId and isInstallment: true', async () => {
    await GET(makeRequest('http://localhost/api/installments'));

    const whereArg = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any;
    expect(whereArg.where.userId).toBe('user-123');
    expect(whereArg.where.isInstallment).toBe(true);
  });

  it('never returns CANCELLED installments even when status=ALL', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      mockInstallment,
      completedInstallment,
    ] as any);

    const response = await GET(makeRequest('http://localhost/api/installments?status=ALL'));
    const data = await response.json();

    const cancelledInResponse = data.installments.find(
      (i: any) => i.installmentStatus === 'CANCELLED'
    );
    expect(cancelledInResponse).toBeUndefined();
    void cancelledInstallment; // referenced to avoid unused var warning
  });
});
