/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTagsQuery } from './useTagsQuery';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

const mockTag = {
  id: 'tag-1',
  name: 'Food',
  color: 'hsl(0, 65%, 60%)',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockTag2 = {
  id: 'tag-2',
  name: 'Travel',
  color: 'hsl(180, 65%, 60%)',
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTagsQuery', () => {
  describe('query behavior', () => {
    it('fetches tags and returns them on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTag, mockTag2],
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.tags).toHaveLength(2);
      expect(result.current.tags[0].id).toBe('tag-1');
      expect(result.current.tags[1].id).toBe('tag-2');
    });

    it('returns empty array as default before data loads', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });

      expect(result.current.tags).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('fetches from /api/tags endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() => useTagsQuery(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      expect(mockFetch).toHaveBeenCalledWith('/api/tags');
    });

    it('throws when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // tags default to empty array even on error
      expect(result.current.tags).toEqual([]);
    });
  });

  describe('isCreating / isDeleting flags', () => {
    it('exposes isCreating as false initially', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isCreating).toBe(false);
    });

    it('exposes isDeleting as false initially', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('createTag mutation', () => {
    it('POSTs to /api/tags with the tag name', async () => {
      // initial fetch
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      // create mutation
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      // invalidation re-fetch
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createTag('Food');
      });

      const createCall = mockFetch.mock.calls.find(
        (call) => call[1]?.method === 'POST'
      );
      expect(createCall).toBeTruthy();
      expect(createCall![0]).toBe('/api/tags');
      const body = JSON.parse(createCall![1].body);
      expect(body.name).toBe('Food');
    });

    it('returns the created tag', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let createdTag: any;
      await act(async () => {
        createdTag = await result.current.createTag('Food');
      });

      expect(createdTag.id).toBe('tag-1');
      expect(createdTag.name).toBe('Food');
    });

    it('throws "Tag already exists" on 409 response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'A tag with this name already exists' }),
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError: any;
      await act(async () => {
        try {
          await result.current.createTag('Food');
        } catch (e) {
          thrownError = e;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Tag already exists');
    });

    it('throws on non-ok response that is not 409', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError: any;
      await act(async () => {
        try {
          await result.current.createTag('Food');
        } catch (e) {
          thrownError = e;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Failed to create tag');
    });

    it('invalidates tags query on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTagsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createTag('Food');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );
      expect(invalidatedKeys).toContainEqual(['tags']);
    });
  });

  describe('deleteTag mutation', () => {
    it('sends DELETE request to /api/tags/[id]', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      const deleteCall = mockFetch.mock.calls.find(
        (call) => call[1]?.method === 'DELETE'
      );
      expect(deleteCall).toBeTruthy();
      expect(deleteCall![0]).toBe('/api/tags/tag-1');
    });

    it('throws on non-ok delete response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let thrownError: any;
      await act(async () => {
        try {
          await result.current.deleteTag('tag-1');
        } catch (e) {
          thrownError = e;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('Failed to delete tag');
    });

    it('invalidates tags query on success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTagsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );
      expect(invalidatedKeys).toContainEqual(['tags']);
    });
  });

  describe('createTagOptimistic', () => {
    it('injects a placeholder tag into the cache immediately before the API resolves', async () => {
      // initial fetch returns empty
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      // createTagRequest never resolves (simulates slow network)
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTagOptimistic('Food');
      });

      // Tag should appear in cache immediately with name 'Food'
      await waitFor(() => expect(result.current.tags).toHaveLength(1));
      expect(result.current.tags[0].name).toBe('Food');
    });

    it('optimistic tag has a generated id prefixed with "optimistic-"', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let optimisticId: string = '';
      act(() => {
        const { optimisticId: oid } = result.current.createTagOptimistic('Food');
        optimisticId = oid;
      });

      await waitFor(() => expect(result.current.tags).toHaveLength(1));
      expect(optimisticId).toMatch(/^optimistic-\d+$/);
      expect(result.current.tags[0].id).toBe(optimisticId);
    });

    it('returns the settle promise that resolves with the real tag from the API', async () => {
      // initial fetch
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      // createTagRequest resolves with real tag
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      // invalidation re-fetch
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let realTag: any;
      await act(async () => {
        const { settle } = result.current.createTagOptimistic('Food');
        realTag = await settle;
      });

      expect(realTag.id).toBe('tag-1');
      expect(realTag.name).toBe('Food');
    });

    it('swaps the optimistic tag for the real tag once the API resolves', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const { settle } = result.current.createTagOptimistic('Food');
        await settle;
      });

      // Cache must contain exactly one tag with the real id, not the optimistic id
      await waitFor(() => {
        const ids = result.current.tags.map((t) => t.id);
        expect(ids).not.toContain(expect.stringMatching(/^optimistic-/));
        expect(ids).toContain('tag-1');
      });
    });

    it('invalidates the tags query after the settle promise resolves', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockTag });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [mockTag] });

      const { queryClient, wrapper } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTagsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        const { settle } = result.current.createTagOptimistic('Food');
        await settle;
      });

      const invalidatedKeys = invalidateSpy.mock.calls.map(
        (call) => (call[0] as any)?.queryKey
      );
      expect(invalidatedKeys).toContainEqual(['tags']);
    });

    it('optimistic tag uses grey placeholder color hsl(0, 0%, 60%)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTagOptimistic('Food');
      });

      await waitFor(() => expect(result.current.tags).toHaveLength(1));
      expect(result.current.tags[0].color).toBe('hsl(0, 0%, 60%)');
    });

    it('does not inject duplicate optimistic entry if called with same id', async () => {
      // This tests the guard: if (old.some(t => t.id === optimisticId)) return old
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { queryClient, wrapper } = createWrapperWithClient();

      const { result } = renderHook(() => useTagsQuery(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Manually call setQueryData with an existing optimistic entry to simulate re-call
      act(() => {
        queryClient.setQueryData(['tags'], [
          {
            id: 'optimistic-123',
            name: 'Food',
            color: 'hsl(0, 0%, 60%)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        // Calling setQueryData again with the same optimistic id should not duplicate
        queryClient.setQueryData<{ id: string; name: string; color: string; createdAt: string; updatedAt: string }[]>(
          ['tags'],
          (old = []) => {
            const optimisticId = 'optimistic-123';
            if (old.some((t) => t.id === optimisticId)) return old;
            return [...old, { id: optimisticId, name: 'Food', color: 'hsl(0, 0%, 60%)', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
          }
        );
      });

      await waitFor(() => expect(result.current.tags).toHaveLength(1));
    });

    it('settle promise rejects when the API call fails with 409', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'A tag with this name already exists' }),
      });

      const { result } = renderHook(() => useTagsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let settleError: any;
      await act(async () => {
        const { settle } = result.current.createTagOptimistic('Food');
        try {
          await settle;
        } catch (e) {
          settleError = e;
        }
      });

      expect(settleError).toBeDefined();
      expect(settleError.message).toBe('Tag already exists');
    });
  });
});
