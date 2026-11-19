/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
      update: vi.fn(),
      create: vi.fn(),
    },
    financialAccount: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock timingSafeEqual to allow controllable auth in tests
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    timingSafeEqual: vi.fn(),
  };
});

import { POST } from './route';
import { db } from '@/lib/prisma';
import { timingSafeEqual } from 'crypto';

const VALID_SECRET = 'test-cron-secret';

function makePostRequest(token?: string) {
  return new NextRequest('http://localhost/api/cron/process-installments', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

// A mock installment with a start date in the past so shouldProcess = true
const today = new Date();
today.setHours(0, 0, 0, 0);
const pastDate = new Date(today);
pastDate.setDate(pastDate.getDate() - 35); // 35 days ago — more than 30 days

const mockInstallment = {
  id: 'install-1',
  userId: 'user-123',
  name: 'Laptop Payment',
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  amount: 1200,
  monthlyAmount: 100,
  installmentDuration: 12,
  remainingInstallments: 10,
  installmentStartDate: pastDate,
  lastProcessedDate: pastDate,
  installmentStatus: 'ACTIVE',
};

beforeEach(() => {
  vi.resetAllMocks();
  // Set process.env.CRON_SECRET
  process.env.CRON_SECRET = VALID_SECRET;
  // Make timingSafeEqual return true by default (authorized)
  vi.mocked(timingSafeEqual).mockReturnValue(true);
});

// -----------------------------------------------------------------------
// POST /api/cron/process-installments — authorization
// -----------------------------------------------------------------------
describe('POST /api/cron/process-installments — authorization', () => {
  it('returns 401 when no authorization header provided', async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(false);

    const response = await POST(makePostRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token does not match secret', async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(false);

    const response = await POST(makePostRequest('wrong-secret'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

// -----------------------------------------------------------------------
// POST /api/cron/process-installments — happy path
// -----------------------------------------------------------------------
describe('POST /api/cron/process-installments — processing', () => {
  beforeEach(() => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockInstallment] as any);
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}] as any);
  });

  it('returns 200 with processed count', async () => {
    const response = await POST(makePostRequest(VALID_SECRET));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(1);
  });

  it('calls db.$transaction with an array (batch form, Pattern A)', async () => {
    await POST(makePostRequest(VALID_SECRET));

    const callArg = vi.mocked(db.$transaction).mock.calls[0][0];
    expect(Array.isArray(callArg)).toBe(true);
  });

  it('batch contains [financialAccount.update, expenseTransaction.update, expenseTransaction.create]', async () => {
    await POST(makePostRequest(VALID_SECRET));

    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('returns success=true and zero processed when no installments are due', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([]);

    const response = await POST(makePostRequest(VALID_SECRET));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(0);
  });

  it('marks installment as completed when remainingInstallments === 1', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      { ...mockInstallment, remainingInstallments: 1 },
    ] as any);

    await POST(makePostRequest(VALID_SECRET));

    // Batch should still be called with 3 operations
    const callArg: any[] = vi.mocked(db.$transaction).mock.calls[0][0] as any[];
    expect(callArg).toHaveLength(3);
  });

  it('records failed installment in results when db.$transaction rejects', async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(VALID_SECRET));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results[0].status).toBe('failed');
    expect(data.results[0].id).toBe('install-1');
  });

  it('skips installment processed fewer than 30 days ago (first payment not yet due)', async () => {
    const recentDate = new Date(today);
    recentDate.setDate(recentDate.getDate() - 10); // only 10 days ago

    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      { ...mockInstallment, lastProcessedDate: recentDate },
    ] as any);

    const response = await POST(makePostRequest(VALID_SECRET));
    const data = await response.json();

    expect(data.processed).toBe(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// POST /api/cron/process-installments — outer error
// -----------------------------------------------------------------------
describe('POST /api/cron/process-installments — outer error', () => {
  it('returns 500 when findMany throws', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(VALID_SECRET));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process installments');
  });
});

// -----------------------------------------------------------------------
// AC7 characterization (MM-033): the cron owns the remainingInstallments counter.
// Written and passing before the PATCH schema drops the field.
// -----------------------------------------------------------------------
describe('POST /api/cron/process-installments - counter characterization', () => {
  beforeEach(() => {
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}, {}] as any);
  });

  it('decrements the counter by 1, keeps it ACTIVE and names the child payment N/duration', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([mockInstallment] as any);

    await POST(makePostRequest(VALID_SECRET));

    const update = vi.mocked(db.expenseTransaction.update).mock.calls[0][0] as any;
    expect(update.data.remainingInstallments).toEqual({ decrement: 1 });
    expect(update.data.installmentStatus).toBe('ACTIVE');
    const create = vi.mocked(db.expenseTransaction.create).mock.calls[0][0] as any;
    expect(create.data.name).toBe('Laptop Payment (Payment 3/12)');
    expect(create.data.isSystemGenerated).toBe(true);
    expect(create.data.parentInstallmentId).toBe('install-1');
  });

  it('completes the installment on the last payment', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      { ...mockInstallment, remainingInstallments: 1 },
    ] as any);

    await POST(makePostRequest(VALID_SECRET));

    const update = vi.mocked(db.expenseTransaction.update).mock.calls[0][0] as any;
    expect(update.data.remainingInstallments).toEqual({ decrement: 1 });
    expect(update.data.installmentStatus).toBe('COMPLETED');
  });
});
