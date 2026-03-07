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


function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/cards', {
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
// GET /api/cards
// -----------------------------------------------------------------------
describe('GET /api/cards', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns transformed credit cards for authenticated user', async () => {
    const mockCards = [
      {
        id: 'card-1',
        name: 'Visa',
        accountType: 'CREDIT_CARD',
        initialBalance: { toString: () => '-1000' },
        currentBalance: { toString: () => '-500' },
      },
    ];
    vi.mocked(db.financialAccount.findMany).mockResolvedValue(mockCards as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].initialBalance).toBe(-1000);
    expect(data[0].currentBalance).toBe(-500);
  });

  it('queries only CREDIT_CARD account type', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([]);

    await GET();

    expect(db.financialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountType: 'CREDIT_CARD',
        }),
      })
    );
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.financialAccount.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/cards
// -----------------------------------------------------------------------
describe('POST /api/cards', () => {
  const validBody = {
    name: 'My Visa',
    initialBalance: '-500.00',
    statementDate: 15,
    dueDate: 20,
  };

  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 with created card on valid input', async () => {
    const mockCard = { id: 'card-new', ...validBody, accountType: 'CREDIT_CARD', currentBalance: -500 };
    vi.mocked(db.financialAccount.create).mockResolvedValue(mockCard as any);

    const response = await POST(makePostRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('card-new');
  });

  it('always sets accountType to CREDIT_CARD', async () => {
    const mockCard = { id: 'card-new', accountType: 'CREDIT_CARD' };
    vi.mocked(db.financialAccount.create).mockResolvedValue(mockCard as any);

    await POST(makePostRequest(validBody));

    expect(db.financialAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: 'CREDIT_CARD' }),
      })
    );
  });

  it('returns 400 when name is empty', async () => {
    const body = { ...validBody, name: '' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });

  it('returns 400 when name exceeds 50 characters', async () => {
    const body = { ...validBody, name: 'X'.repeat(51) };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when initialBalance is missing', async () => {
    const { initialBalance: _removed, ...body } = validBody;

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when initialBalance is non-numeric', async () => {
    const body = { ...validBody, initialBalance: 'not-a-number' };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when statementDate is out of range (> 31)', async () => {
    const body = { ...validBody, statementDate: 32 };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when dueDate is out of range (< 1)', async () => {
    const body = { ...validBody, dueDate: 0 };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('accepts optional cardGroup field', async () => {
    const body = { ...validBody, cardGroup: 'Personal' };
    const mockCard = { id: 'card-new', ...body, accountType: 'CREDIT_CARD' };
    vi.mocked(db.financialAccount.create).mockResolvedValue(mockCard as any);

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(201);
  });

  it('returns 400 when cardGroup exceeds 50 characters', async () => {
    const body = { ...validBody, cardGroup: 'G'.repeat(51) };

    const response = await POST(makePostRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when body is empty', async () => {
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
