import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRecentTransactions } from './useRecentTransactions'
import type { RecentTransaction } from './useRecentTransactions'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockTransactions: RecentTransaction[] = [
  {
    id: 'tx-1',
    type: 'EXPENSE',
    name: 'Groceries',
    amount: 150.00,
    date: '2024-01-15',
    accountId: 'acc-1',
    accountName: 'Checking',
    categoryId: 'cat-1',
    categoryName: 'Food',
  },
  {
    id: 'tx-2',
    type: 'INCOME',
    name: 'Salary',
    amount: 5000.00,
    date: '2024-01-01',
    accountId: 'acc-1',
    accountName: 'Checking',
    categoryId: 'cat-2',
    categoryName: 'Salary',
  },
  {
    id: 'tx-3',
    type: 'TRANSFER',
    name: 'Savings Transfer',
    amount: 500.00,
    date: '2024-01-05',
    accountId: 'acc-1',
    accountName: 'Checking',
    categoryId: 'cat-3',
    categoryName: 'Transfer',
    toAccountId: 'acc-2',
    toAccountName: 'Savings',
  },
]

describe('useRecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array and loading state initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    expect(result.current.transactions).toEqual([])
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns transactions on successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: mockTransactions }),
    })

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.transactions).toHaveLength(3)
    expect(result.current.transactions[0].id).toBe('tx-1')
    expect(result.current.transactions[0].type).toBe('EXPENSE')
    expect(result.current.error).toBeNull()
  })

  it('returns transfer transaction with toAccountId and toAccountName', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [mockTransactions[2]] }),
    })

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.transactions[0].toAccountId).toBe('acc-2')
    expect(result.current.transactions[0].toAccountName).toBe('Savings')
  })

  it('returns error message when fetch fails with non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch recent transactions')
    expect(result.current.transactions).toEqual([])
  })

  it('returns error message when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Network error')
    expect(result.current.transactions).toEqual([])
  })

  it('returns empty transactions array when API returns empty list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactions: [] }),
    })

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.transactions).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('returns generic error string when error is not an Error instance', async () => {
    // Simulate a thrown string (not an Error object)
    mockFetch.mockRejectedValueOnce('Some string error')

    const { result } = renderHook(() => useRecentTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('An error occurred')
  })
})
