/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  db: {
    payPlan: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    financialAccount: { count: vi.fn() },
    transferType: { count: vi.fn() },
  },
}));

import { GET, POST } from './route';
import { PATCH, DELETE } from './[id]/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = { user: { id: 'user-123' }, session: { id: 's' } };

const validBody = {
  name: 'Standard',
  savePercent: '30',
  sourceAccountId: 'acc-src',
  saveAccountId: 'acc-save',
  spendAccountId: 'acc-spend',
  transferTypeId: 'tt-1',
  lines: [
    { name: 'EF', kind: 'PERCENT', value: '60' },
    { name: 'Sinking', kind: 'PERCENT', value: '40' },
  ],
};

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/pay-plans', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const idParams = { params: Promise.resolve({ id: 'plan-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
  vi.mocked(db.financialAccount.count as any).mockResolvedValue(3);
  vi.mocked(db.transferType.count as any).mockResolvedValue(1);
});

describe('GET /api/pay-plans', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await GET()).status).toBe(401);
  });

  it('lists only the session user plans', async () => {
    vi.mocked(db.payPlan.findMany as any).mockResolvedValue([{ id: 'p1' }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'p1' }]);
    expect(vi.mocked(db.payPlan.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-123' },
      orderBy: { name: 'asc' },
    });
  });
});

describe('POST /api/pay-plans', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await POST(req('POST', validBody))).status).toBe(401);
  });

  it('returns 400 when percent lines do not total 100', async () => {
    const res = await POST(
      req('POST', { ...validBody, lines: [{ name: 'EF', kind: 'PERCENT', value: '90' }] })
    );
    expect(res.status).toBe(400);
    expect(db.payPlan.create).not.toHaveBeenCalled();
  });

  it('returns 400 when an account does not belong to the user', async () => {
    vi.mocked(db.financialAccount.count as any).mockResolvedValue(2);
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(400);
    expect(db.payPlan.create).not.toHaveBeenCalled();
    expect(vi.mocked(db.financialAccount.count).mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-123' },
    });
  });

  it('counts distinct accounts when source and save are the same', async () => {
    vi.mocked(db.financialAccount.count as any).mockResolvedValue(2);
    vi.mocked(db.payPlan.create as any).mockResolvedValue({ id: 'p1' });
    const res = await POST(req('POST', { ...validBody, saveAccountId: 'acc-src' }));
    expect(res.status).toBe(201);
  });

  it('returns 409 on a duplicate name', async () => {
    vi.mocked(db.payPlan.create as any).mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' })
    );
    expect((await POST(req('POST', validBody))).status).toBe(409);
  });

  it('creates the plan scoped to the user', async () => {
    vi.mocked(db.payPlan.create as any).mockResolvedValue({ id: 'p1' });
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    expect(vi.mocked(db.payPlan.create).mock.calls[0][0]).toMatchObject({
      data: { userId: 'user-123', name: 'Standard', savePercent: '30', lines: validBody.lines },
    });
  });
});

describe('PATCH /api/pay-plans/[id]', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await PATCH(req('PATCH', validBody), idParams)).status).toBe(401);
  });

  it('returns 400 on invalid lines', async () => {
    const res = await PATCH(
      req('PATCH', { ...validBody, lines: [{ name: 'EF', kind: 'PERCENT', value: '50' }] }),
      idParams
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 on a foreign transfer type', async () => {
    vi.mocked(db.transferType.count as any).mockResolvedValue(0);
    expect((await PATCH(req('PATCH', validBody), idParams)).status).toBe(400);
  });

  it('updates with id and userId in the where clause', async () => {
    vi.mocked(db.payPlan.update as any).mockResolvedValue({ id: 'plan-1' });
    const res = await PATCH(req('PATCH', validBody), idParams);
    expect(res.status).toBe(200);
    expect(vi.mocked(db.payPlan.update).mock.calls[0][0]).toMatchObject({
      where: { id: 'plan-1', userId: 'user-123' },
    });
  });

  it('maps P2025 to 404 and P2002 to 409', async () => {
    vi.mocked(db.payPlan.update as any).mockRejectedValueOnce(
      Object.assign(new Error('nf'), { code: 'P2025' })
    );
    expect((await PATCH(req('PATCH', validBody), idParams)).status).toBe(404);
    vi.mocked(db.payPlan.update as any).mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: 'P2002' })
    );
    expect((await PATCH(req('PATCH', validBody), idParams)).status).toBe(409);
  });
});

describe('DELETE /api/pay-plans/[id]', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    expect((await DELETE(req('DELETE'), idParams)).status).toBe(401);
  });

  it('deletes scoped by user and maps P2025 to 404', async () => {
    vi.mocked(db.payPlan.delete as any).mockResolvedValue({});
    expect((await DELETE(req('DELETE'), idParams)).status).toBe(200);
    expect(vi.mocked(db.payPlan.delete).mock.calls[0][0]).toMatchObject({
      where: { id: 'plan-1', userId: 'user-123' },
    });
    vi.mocked(db.payPlan.delete as any).mockRejectedValueOnce(
      Object.assign(new Error('nf'), { code: 'P2025' })
    );
    expect((await DELETE(req('DELETE'), idParams)).status).toBe(404);
  });
});
