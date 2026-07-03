/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/net-worth', () => ({
  calculateCurrentNetWorth: vi.fn(),
  calculateMonthlyChange: vi.fn(),
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { calculateCurrentNetWorth, calculateMonthlyChange } from '@/lib/net-worth';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(calculateCurrentNetWorth).mockResolvedValue(5000);
  vi.mocked(calculateMonthlyChange).mockResolvedValue({ change: 200, percentage: 4.17 });
});

describe('GET /api/net-worth', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns currentNetWorth and monthlyChange shape', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('currentNetWorth', 5000);
    expect(data).toHaveProperty('monthlyChange');
    expect(data.monthlyChange).toHaveProperty('amount', 200);
    expect(data.monthlyChange).toHaveProperty('percentage', 4.17);
  });

  it('calls calculateCurrentNetWorth once and passes result to calculateMonthlyChange', async () => {
    vi.mocked(calculateCurrentNetWorth).mockResolvedValue(12345.67);

    await GET();

    expect(calculateCurrentNetWorth).toHaveBeenCalledTimes(1);
    expect(calculateCurrentNetWorth).toHaveBeenCalledWith('user-123');
    expect(calculateMonthlyChange).toHaveBeenCalledTimes(1);
    expect(calculateMonthlyChange).toHaveBeenCalledWith('user-123', 12345.67);
  });

  it('returns 500 when calculateCurrentNetWorth throws', async () => {
    vi.mocked(calculateCurrentNetWorth).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
