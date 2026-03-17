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
    tag: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { DELETE, PATCH } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/prisma';

const mockSession = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  session: { id: 'session-abc' },
};

const mockTag = {
  id: 'tag-1',
  userId: 'user-123',
  name: 'Food',
  color: 'hsl(0, 65%, 60%)',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeParams(id = 'tag-1') {
  return { params: Promise.resolve({ id }) };
}

function makeDeleteRequest(id = 'tag-1') {
  return new NextRequest(`http://localhost/api/tags/${id}`, { method: 'DELETE' });
}

function makePatchRequest(body: unknown, id = 'tag-1') {
  return new NextRequest(`http://localhost/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
});

// -----------------------------------------------------------------------
// DELETE /api/tags/[id]
// -----------------------------------------------------------------------
describe('DELETE /api/tags/[id]', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when tag does not exist', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tag not found');
  });

  it('returns 404 when tag belongs to a different user', async () => {
    const otherUserTag = { ...mockTag, userId: 'other-user-456' };
    vi.mocked(db.tag.findUnique).mockResolvedValue(otherUserTag as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tag not found');
  });

  it('deletes tag and returns { deleted: true } on success', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.delete).mockResolvedValue(mockTag as any);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);
  });

  it('calls db.tag.delete with the correct id', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.delete).mockResolvedValue(mockTag as any);

    await DELETE(makeDeleteRequest('tag-1'), makeParams('tag-1'));

    expect(db.tag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.tag.findUnique).mockRejectedValue(new Error('DB error'));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// PATCH /api/tags/[id]
// -----------------------------------------------------------------------
describe('PATCH /api/tags/[id]', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when tag does not exist', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tag not found');
  });

  it('returns 404 when tag belongs to a different user', async () => {
    const otherUserTag = { ...mockTag, userId: 'other-user-456' };
    vi.mocked(db.tag.findUnique).mockResolvedValue(otherUserTag as any);

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tag not found');
  });

  it('returns 400 when name is empty', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);

    const response = await PATCH(makePatchRequest({ name: '' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('returns 400 when name exceeds 50 characters', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);

    const response = await PATCH(makePatchRequest({ name: 'A'.repeat(51) }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is too long');
  });

  it('returns updated tag on successful rename', async () => {
    const updatedTag = { ...mockTag, name: 'Groceries' };
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.update).mockResolvedValue(updatedTag as any);

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Groceries');
  });

  it('calls db.tag.update with the correct id and name', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.update).mockResolvedValue({ ...mockTag, name: 'Groceries' } as any);

    await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams('tag-1'));

    expect(db.tag.update).toHaveBeenCalledWith({
      where: { id: 'tag-1' },
      data: { name: 'Groceries' },
    });
  });

  it('returns 409 when new name already exists (Unique constraint error)', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.update).mockRejectedValue(
      new Error('Unique constraint failed on the fields: (`userId`,`name`)')
    );

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A tag with this name already exists');
  });

  it('returns 500 when database throws a non-unique error', async () => {
    vi.mocked(db.tag.findUnique).mockResolvedValue(mockTag as any);
    vi.mocked(db.tag.update).mockRejectedValue(new Error('Connection timeout'));

    const response = await PATCH(makePatchRequest({ name: 'Groceries' }), makeParams());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
