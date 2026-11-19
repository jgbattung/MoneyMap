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
    incomeType: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/income-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

describe('POST /api/income-types - money validation', () => {
  it.each(['100.125', '1e3', '-5'])('returns 400 and writes nothing for monthlyTarget %j', async (monthlyTarget) => {
    const response = await POST(makePostRequest({ name: 'Salary', monthlyTarget }));

    expect(response.status).toBe(400);
    expect(db.incomeType.create).not.toHaveBeenCalled();
  });

  it('accepts a valid 2-decimal monthlyTarget', async () => {
    vi.mocked(db.incomeType.create).mockResolvedValue({ id: 'it-1' } as any);

    const response = await POST(makePostRequest({ name: 'Salary', monthlyTarget: '5000.50' }));

    expect(response.status).toBe(200);
  });
});
