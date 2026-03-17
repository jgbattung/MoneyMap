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
      findMany: vi.fn(),
      count: vi.fn(),
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

const mockTag = {
  id: 'tag-1',
  userId: 'user-123',
  name: 'Food',
  color: 'hsl(0, 65%, 60%)',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/tags', {
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
// GET /api/tags
// -----------------------------------------------------------------------
describe('GET /api/tags', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns list of tags for authenticated user', async () => {
    vi.mocked(db.tag.findMany).mockResolvedValue([mockTag] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('tag-1');
  });

  it('returns empty array when user has no tags', async () => {
    vi.mocked(db.tag.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('queries only tags belonging to the session user', async () => {
    vi.mocked(db.tag.findMany).mockResolvedValue([]);

    await GET();

    expect(db.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-123' }),
      })
    );
  });

  it('orders tags by name ascending', async () => {
    vi.mocked(db.tag.findMany).mockResolvedValue([]);

    await GET();

    expect(db.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      })
    );
  });

  it('returns 500 when database throws', async () => {
    vi.mocked(db.tag.findMany).mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// -----------------------------------------------------------------------
// POST /api/tags
// -----------------------------------------------------------------------
describe('POST /api/tags', () => {
  it('returns 401 when no session exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST(makePostRequest({ name: 'Food' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 201 with created tag on valid input', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(0);
    vi.mocked(db.tag.create).mockResolvedValue(mockTag as any);

    const response = await POST(makePostRequest({ name: 'Food' }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('tag-1');
    expect(data.name).toBe('Food');
  });

  it('returns 400 when name is empty', async () => {
    const response = await POST(makePostRequest({ name: '' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('returns 400 when name exceeds 50 characters', async () => {
    const response = await POST(makePostRequest({ name: 'A'.repeat(51) }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is too long');
  });

  it('returns 400 when name field is missing', async () => {
    const response = await POST(makePostRequest({}));

    expect(response.status).toBe(400);
  });

  it('calculates color based on existing tag count', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(3);
    const createdTag = { ...mockTag, color: 'hsl(270, 65%, 60%)' };
    vi.mocked(db.tag.create).mockResolvedValue(createdTag as any);

    const response = await POST(makePostRequest({ name: 'Travel' }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          color: expect.stringContaining('hsl('),
        }),
      })
    );
    expect(data.color).toBe('hsl(270, 65%, 60%)');
  });

  it('assigns hsl(0, 65%, 60%) color when user has no existing tags', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(0);
    vi.mocked(db.tag.create).mockResolvedValue(mockTag as any);

    await POST(makePostRequest({ name: 'First' }));

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          color: 'hsl(0, 65%, 60%)',
        }),
      })
    );
  });

  it('returns 409 when tag name already exists (Unique constraint error)', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(0);
    vi.mocked(db.tag.create).mockRejectedValue(
      new Error('Unique constraint failed on the fields: (`userId`,`name`)')
    );

    const response = await POST(makePostRequest({ name: 'Food' }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A tag with this name already exists');
  });

  it('returns 500 when database throws a non-unique error', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(0);
    vi.mocked(db.tag.create).mockRejectedValue(new Error('Connection timeout'));

    const response = await POST(makePostRequest({ name: 'Food' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('creates tag with the session user id', async () => {
    vi.mocked(db.tag.count).mockResolvedValue(0);
    vi.mocked(db.tag.create).mockResolvedValue(mockTag as any);

    await POST(makePostRequest({ name: 'Food' }));

    expect(db.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-123', name: 'Food' }),
      })
    );
  });
});
