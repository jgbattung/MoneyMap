import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getMonthlyFlowAggregates = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({ db: {} }))
vi.mock('@/lib/net-worth-history', async () => {
  const actual = await vi.importActual<typeof import('@/lib/net-worth-history')>('@/lib/net-worth-history')
  return { ...actual, getMonthlyFlowAggregates }
})

import { getMonthlyTrends } from './trends'

describe('getMonthlyTrends', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T00:00:00Z'))
    getMonthlyFlowAggregates.mockResolvedValue({
      totalInitialBalance: 1000,
      incomeRows: [
        { year: 2026, month: 2, total: 50000 },
        { year: 2026, month: 3, total: 0 },
      ],
      expenseRows: [
        { year: 2026, month: 2, total: 20000 },
        { year: 2026, month: 3, total: 3000 },
        { year: 2026, month: 4, total: 500 },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads aggregates for the given user only', async () => {
    await getMonthlyTrends('user-1', {})
    expect(getMonthlyFlowAggregates).toHaveBeenCalledWith('user-1')
  })

  it('never returns months before dataStartsAt, oldest first', async () => {
    const r = await getMonthlyTrends('user-1', { from: '2025-11', to: '2026-04' })
    expect(r.dataStartsAt).toBe('2026-02')
    expect(r.months.map((m) => m.month)).toEqual(['2026-02', '2026-03', '2026-04'])
  })

  it('computes saved, savings rate and cumulative month-end net worth', async () => {
    const r = await getMonthlyTrends('user-1', { from: '2026-02', to: '2026-04' })
    expect(r.months[0]).toEqual({
      month: '2026-02',
      income: 50000,
      expenses: 20000,
      saved: 30000,
      savingsRate: 0.6,
      netWorthEnd: 31000,
    })
    expect(r.months[1].netWorthEnd).toBe(28000)
    expect(r.months[2].netWorthEnd).toBe(27500)
  })

  it('returns savingsRate null when income is 0', async () => {
    const r = await getMonthlyTrends('user-1', { from: '2026-02', to: '2026-04' })
    expect(r.months[1].income).toBe(0)
    expect(r.months[1].savingsRate).toBeNull()
    expect(r.months[2].savingsRate).toBeNull()
  })

  it('does not return months after the current PH month', async () => {
    const r = await getMonthlyTrends('user-1', { from: '2026-03', to: '2026-09' })
    expect(r.months.map((m) => m.month)).toEqual(['2026-03', '2026-04'])
  })

  it('returns an empty result when the user has no net-worth accounts', async () => {
    getMonthlyFlowAggregates.mockResolvedValue(null)
    expect(await getMonthlyTrends('user-1', {})).toEqual({ currency: 'PHP', dataStartsAt: null, months: [] })
  })

  it('returns an empty result when there are no transactions', async () => {
    getMonthlyFlowAggregates.mockResolvedValue({ totalInitialBalance: 5, incomeRows: [], expenseRows: [] })
    const r = await getMonthlyTrends('user-1', {})
    expect(r.dataStartsAt).toBeNull()
    expect(r.months).toEqual([])
  })
})
