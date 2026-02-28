import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useNetWorth } from './useNetWorth'

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

describe('useNetWorth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default values while loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    expect(result.current.netWorth).toBe(0)
    expect(result.current.monthlyChange).toEqual({ amount: 0, percentage: 0 })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns net worth data on successful fetch', async () => {
    const mockData = {
      currentNetWorth: 15000,
      monthlyChange: { amount: 500, percentage: 3.4 },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.netWorth).toBe(15000)
    expect(result.current.monthlyChange).toEqual({ amount: 500, percentage: 3.4 })
    expect(result.current.error).toBeNull()
  })

  it('returns error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch net worth')
    expect(result.current.netWorth).toBe(0)
    expect(result.current.monthlyChange).toEqual({ amount: 0, percentage: 0 })
  })

  it('returns error message when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Network error')
    expect(result.current.netWorth).toBe(0)
  })

  it('returns zero net worth when fetch returns zero values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        currentNetWorth: 0,
        monthlyChange: { amount: 0, percentage: 0 },
      }),
    })

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.netWorth).toBe(0)
    expect(result.current.monthlyChange).toEqual({ amount: 0, percentage: 0 })
  })

  it('handles negative net worth correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        currentNetWorth: -2000,
        monthlyChange: { amount: -300, percentage: -15 },
      }),
    })

    const { result } = renderHook(() => useNetWorth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.netWorth).toBe(-2000)
    expect(result.current.monthlyChange).toEqual({ amount: -300, percentage: -15 })
  })
})
