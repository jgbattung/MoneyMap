/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInstallmentsQuery, useInstallmentQuery } from './useInstallmentsQuery';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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

const mockInstallment = {
  id: 'inst-1',
  userId: 'user-123',
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  name: 'iPhone 16',
  amount: '60000.00',
  date: '2026-01-01',
  isInstallment: true,
  installmentStatus: 'ACTIVE',
  installmentDuration: 6,
  remainingInstallments: 4,
  installmentStartDate: '2026-01-01',
  monthlyAmount: '10000.00',
  lastProcessedDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  account: { id: 'acc-1', name: 'GCash' },
  expenseType: { id: 'type-1', name: 'Electronics' },
  expenseSubcategory: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------
// useInstallmentsQuery — fetching
// -----------------------------------------------------------------------
describe('useInstallmentsQuery', () => {
  it('fetches with default ACTIVE status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installments: [mockInstallment] }),
    } as any);

    const { result } = renderHook(() => useInstallmentsQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('status=ACTIVE')
    );
    expect(result.current.installments).toHaveLength(1);
    expect(result.current.installments[0].id).toBe('inst-1');
  });

  it('fetches with status=ALL when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installments: [mockInstallment] }),
    } as any);

    const { result } = renderHook(() => useInstallmentsQuery({ status: 'ALL' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('status=ALL')
    );
  });

  it('updateInstallment PATCH success invalidates the right keys', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installments: [mockInstallment] }),
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useInstallmentsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Mock the PATCH response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockInstallment, name: 'Updated Name' }),
    } as any);

    // Mock any subsequent refetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ installments: [] }),
    } as any);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.updateInstallment({ id: 'inst-1', name: 'Updated Name' });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]));
    expect(invalidatedKeys.some((k) => k.includes('installments'))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes('expenseTransactions'))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes('accounts'))).toBe(true);
  });

  it('deleteInstallment error shows toast', async () => {
    const { toast } = await import('sonner');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ installments: [mockInstallment] }),
    } as any);

    const { result } = renderHook(() => useInstallmentsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate DELETE failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    } as any);

    // Mock refetch after settled
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ installments: [] }),
    } as any);

    await act(async () => {
      result.current.deleteInstallment('inst-1');
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to delete installment',
        expect.objectContaining({ duration: 6000 })
      );
    });
  });
});

// -----------------------------------------------------------------------
// useInstallmentQuery — single row
// -----------------------------------------------------------------------
describe('useInstallmentQuery', () => {
  it('fetches single installment by id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockInstallment,
    } as any);

    const { result } = renderHook(() => useInstallmentQuery('inst-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/installments/inst-1')
    );
    expect(result.current.installmentData?.id).toBe('inst-1');
  });

  it('does not fetch when enabled=false', () => {
    const { result } = renderHook(
      () => useInstallmentQuery('inst-1', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.installmentData).toBeUndefined();
  });
});
