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
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makeRequest(url = 'http://localhost/api/accounts', options?: RequestInit) {
  return new NextRequest(url, options);
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// GET /api/accounts
// -----------------------------------------------------------------------
describe('GET /api/accounts', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns accounts for authenticated user', async () => {
    const mockAccounts = [
      { id: 'acc-1', name: 'Checking', accountType: 'CHECKING', currentBalance: 1000 },
      { id: 'acc-2', name: 'Savings', accountType: 'SAVINGS', currentBalance: 5000 },
    ];
    vi.mocked(db.financialAccount.findMany).mockResolvedValue(mockAccounts as any);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('excludes CREDIT_CARD accounts by default', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([]);

    await GET(makeRequest());

    expect(db.financialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountType: { not: 'CREDIT_CARD' },
        }),
      })
    );
  });

  it('includes CREDIT_CARD accounts when includeCards=true', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/accounts?includeCards=true'));

    expect(db.financialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountType: undefined,
        }),
      })
    );
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/accounts
// -----------------------------------------------------------------------
describe('POST /api/accounts', () => {
  const validBody = {
    name: 'My Checking',
    accountType: 'CHECKING',
    initialBalance: '1000.00',
    addToNetWorth: true,
  };

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 with created account on valid input', async () => {
    const mockAccount = { id: 'acc-new', ...validBody, initialBalance: 1000, currentBalance: 1000 };
    vi.mocked(db.financialAccount.create).mockResolvedValue(mockAccount as any);

    const response = await POST(makePostRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('acc-new');
  });

  it('returns 400 when name is missing', async () => {
    const body = { ...validBody, name: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('returns 400 when accountType is invalid', async () => {
    const body = { ...validBody, accountType: 'INVALID_TYPE' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when initialBalance is not a number', async () => {
    const body = { ...validBody, initialBalance: 'not-a-number' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when initialBalance is empty string', async () => {
    const body = { ...validBody, initialBalance: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when name exceeds 50 characters', async () => {
    const body = { ...validBody, name: 'A'.repeat(51) };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when statementDate is out of range', async () => {
    const body = { ...validBody, statementDate: 32 };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('accepts optional statementDate and dueDate in valid range', async () => {
    const body = { ...validBody, statementDate: 15, dueDate: 20 };
    const mockAccount = { id: 'acc-new', ...body, initialBalance: 1000, currentBalance: 1000 };
    vi.mocked(db.financialAccount.create).mockResolvedValue(mockAccount as any);

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(201);
  });

  it('returns 400 when required fields are entirely missing', async () => {
    const response = await POST(makePostRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.create).mockRejectedValue(new Error('DB error'));

    const response = await POST(makePostRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
