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
    financialAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    incomeTransaction: {
      count: vi.fn(),
    },
    expenseTransaction: {
      count: vi.fn(),
    },
    transferTransaction: {
      count: vi.fn(),
    },
  },
}));

import { GET, PATCH, DELETE } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockAccount = {
  id: 'acc-1',
  userId: 'user-123',
  name: 'Checking',
  accountType: 'CHECKING',
  initialBalance: 1000,
  currentBalance: 1000,
  addToNetWorth: true,
  statementDate: null,
  dueDate: null,
};

function makeParams(id = 'acc-1') {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url = 'http://localhost/api/accounts/acc-1') {
  return new NextRequest(url);
}

function makePatchRequest(body: unknown, id = 'acc-1') {
  return new NextRequest(`http://localhost/api/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id = 'acc-1') {
  return new NextRequest(`http://localhost/api/accounts/${id}`, { method: 'DELETE' });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/accounts/[id]
// -----------------------------------------------------------------------
describe('GET /api/accounts/[id]', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns the account when found', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(mockAccount as any);

    const response = await GET(makeRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('acc-1');
  });

  it('returns 404 when account not found', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Account not found');
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.findUnique).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// PATCH /api/accounts/[id]
// -----------------------------------------------------------------------
describe('PATCH /api/accounts/[id]', () => {
  const validBody = {
    name: 'Updated Checking',
    accountType: 'CHECKING',
    initialBalance: '2000.00',
    addToNetWorth: true,
  };

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 with updated account on valid input', async () => {
    const updatedAccount = { ...mockAccount, name: 'Updated Checking' };
    vi.mocked(db.financialAccount.update).mockResolvedValue(updatedAccount as any);

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Updated Checking');
  });

  it('returns 400 when name is empty', async () => {
    const body = { ...validBody, name: '' };

    const response = await PATCH(makePatchRequest(body), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('returns 400 when accountType is invalid', async () => {
    const body = { ...validBody, accountType: 'NOT_VALID' };

    const response = await PATCH(makePatchRequest(body), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when initialBalance is non-numeric', async () => {
    const body = { ...validBody, initialBalance: 'abc' };

    const response = await PATCH(makePatchRequest(body), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when dueDate is out of range (0)', async () => {
    const body = { ...validBody, dueDate: 0 };

    const response = await PATCH(makePatchRequest(body), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.update).mockRejectedValue(new Error('DB error'));

    const response = await PATCH(makePatchRequest(validBody), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/accounts/[id]
// -----------------------------------------------------------------------
describe('DELETE /api/accounts/[id]', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when account not found', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Account not found');
  });

  it('returns 400 when account has associated transactions', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(mockAccount as any);
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(2);
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(0);
    vi.mocked(db.transferTransaction.count).mockResolvedValue(0);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete account with existing transactions');
    expect(data.transactionCount).toBe(2);
  });

  it('returns 200 with success message when account is deleted', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(mockAccount as any);
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(0);
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(0);
    vi.mocked(db.transferTransaction.count).mockResolvedValue(0);
    vi.mocked(db.financialAccount.delete).mockResolvedValue(mockAccount as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Account deleted successfully');
  });

  it('counts all transaction types when checking associations', async () => {
    vi.mocked(db.financialAccount.findUnique).mockResolvedValue(mockAccount as any);
    vi.mocked(db.incomeTransaction.count).mockResolvedValue(1);
    vi.mocked(db.expenseTransaction.count).mockResolvedValue(1);
    vi.mocked(db.transferTransaction.count).mockResolvedValue(1);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    // 1 income + 1 expense + 1 from + 1 to = 4 (transfer count mock called twice for from and to)
    expect(response.status).toBe(400);
    expect(data.transactionCount).toBeGreaterThan(0);
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.findUnique).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
