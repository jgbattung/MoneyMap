import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { usePayPlansQuery } from './usePayPlansQuery';
import type { PayPlanInput } from '@/lib/validations/pay-division';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, spy, wrapper };
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey));
}

const plan: PayPlanInput = {
  name: 'Standard',
  savePercent: '30',
  sourceAccountId: 'src',
  saveAccountId: 'sav',
  spendAccountId: 'spd',
  transferTypeId: 'tt-1',
  lines: [{ name: 'EF', kind: 'PERCENT', value: '100' }],
};

const listed = [{ id: 'plan-1', ...plan }];

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === '/api/pay-plans' && !init) return { ok: true, json: async () => listed };
    return { ok: true, json: async () => ({ id: 'plan-1' }) };
  });
});

async function ready() {
  const ctx = setup();
  const hook = renderHook(() => usePayPlansQuery(), { wrapper: ctx.wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  ctx.spy.mockClear();
  return { ...ctx, result: hook.result };
}

describe('usePayPlansQuery', () => {
  it('fetches the plans list', async () => {
    const { result } = await ready();
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-plans');
    expect(result.current.payPlans).toEqual(listed);
    expect(result.current.error).toBeNull();
  });

  it('exposes a readable error when the list fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { wrapper } = setup();
    const { result } = renderHook(() => usePayPlansQuery(), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Failed to fetch pay plans'));
    expect(result.current.payPlans).toEqual([]);
  });

  it('createPayPlan POSTs the plan and invalidates the plans list', async () => {
    const { result, spy } = await ready();
    await act(async () => {
      await result.current.createPayPlan(plan);
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    await waitFor(() => expect(invalidatedKeys(spy)).toEqual([JSON.stringify(['payPlans'])]));
  });

  it('updatePayPlan PATCHes by id without sending the id in the body', async () => {
    const { result, spy } = await ready();
    await act(async () => {
      await result.current.updatePayPlan({ id: 'plan-1', ...plan });
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-plans/plan-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    await waitFor(() => expect(invalidatedKeys(spy)).toEqual([JSON.stringify(['payPlans'])]));
  });

  it('deletePayPlan DELETEs by id and invalidates the plans list', async () => {
    const { result, spy } = await ready();
    await act(async () => {
      await result.current.deletePayPlan('plan-1');
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/pay-plans/plan-1', { method: 'DELETE' });
    await waitFor(() => expect(invalidatedKeys(spy)).toEqual([JSON.stringify(['payPlans'])]));
  });

  it('surfaces the server error message and does not invalidate on failure', async () => {
    const { result, spy } = await ready();
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'A plan with this name already exists' }) });
    await act(async () => {
      await expect(result.current.createPayPlan(plan)).rejects.toThrow('A plan with this name already exists');
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    const { result } = await ready();
    mockFetch.mockResolvedValue({ ok: false, json: async () => { throw new Error('not json'); } });
    await act(async () => {
      await expect(result.current.deletePayPlan('plan-1')).rejects.toThrow('Failed to delete pay plan');
    });
  });
});
