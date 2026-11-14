/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { findMany: vi.fn() },
    incomeTransaction: { groupBy: vi.fn() },
    expenseTransaction: { groupBy: vi.fn(), aggregate: vi.fn(), findFirst: vi.fn() },
    transferTransaction: { groupBy: vi.fn() },
  },
}))

import { db } from '@/lib/prisma'
import { getSavingsFlows } from './savings'

const D = (v: string) => ({ toString: () => v })
const day = (s: string) => new Date(`${s}T00:00:00Z`)

describe('getSavingsFlows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'))
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      { id: 'tonik', name: 'Tonik', accountType: 'SAVINGS', currentBalance: D('100000') },
      { id: 'mp2', name: 'MP2', accountType: 'INVESTMENT', currentBalance: D('50000.50') },
    ] as any)
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([])
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([])
    vi.mocked(db.transferTransaction.groupBy).mockResolvedValue([])
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('30000') } } as any)
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({ date: day('2026-01-05') } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scopes every query to the user and to savings-type accounts', async () => {
    await getSavingsFlows('user-1', { from: '2026-05', to: '2026-05' })

    const inc = vi.mocked(db.incomeTransaction.groupBy).mock.calls[0][0] as any
    expect(inc.where.userId).toBe('user-1')
    expect(inc.where.account).toEqual({ accountType: { in: ['SAVINGS', 'INVESTMENT', 'RETIREMENT'] }, userId: 'user-1' })

    const exp = vi.mocked(db.expenseTransaction.groupBy).mock.calls[0][0] as any
    expect(exp.where.userId).toBe('user-1')
    expect(exp.where.isInstallment).toBe(false)

    for (const call of vi.mocked(db.transferTransaction.groupBy).mock.calls as any[]) {
      expect(call[0].where.userId).toBe('user-1')
    }
    expect(vi.mocked(db.financialAccount.findMany).mock.calls[0][0]).toMatchObject({ where: { userId: 'user-1' } })
  })

  it('counts a transfer from checking as savings inflow, not income', async () => {
    // First transfer groupBy call is "to", second is "from" (see loadAccountFlows order).
    vi.mocked(db.transferTransaction.groupBy)
      .mockResolvedValueOnce([{ toAccountId: 'tonik', date: day('2026-05-02'), _sum: { amount: 10000 } }] as any)
      .mockResolvedValueOnce([])

    const r = await getSavingsFlows('user-1', { from: '2026-05', to: '2026-05' })
    const tonik = r.byType[0].accounts[0]
    expect(tonik.months[0]).toEqual({ month: '2026-05', inflow: 10000, outflow: 0, net: 10000 })
    expect(db.incomeTransaction.groupBy).toHaveBeenCalledTimes(1)
    const inc = vi.mocked(db.incomeTransaction.groupBy).mock.results[0]
    expect(await inc.value).toEqual([])
  })

  it('counts a transfer fee once, as an expense outflow', async () => {
    vi.mocked(db.transferTransaction.groupBy)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ fromAccountId: 'tonik', date: day('2026-05-03'), _sum: { amount: 5000 } }] as any)
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValueOnce([
      { accountId: 'tonik', date: day('2026-05-03'), _sum: { amount: D('15') } },
    ] as any)

    const r = await getSavingsFlows('user-1', { from: '2026-05', to: '2026-05' })
    expect(r.byType[0].accounts[0].months[0]).toEqual({ month: '2026-05', inflow: 0, outflow: 5015, net: -5015 })
  })

  it('groups by type with balances and combines income, expense and cron-timestamped rows by month', async () => {
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([
      { accountId: 'tonik', date: day('2026-04-30'), _sum: { amount: D('200') } },
      { accountId: 'tonik', date: new Date('2026-04-30T00:05:00Z'), _sum: { amount: D('50') } },
    ] as any)

    const r = await getSavingsFlows('user-1', { from: '2026-04', to: '2026-05' })
    expect(r.byType.map((t) => [t.type, t.totalBalance])).toEqual([
      ['SAVINGS', 100000],
      ['INVESTMENT', 50000.5],
    ])
    const tonik = r.byType[0].accounts[0]
    expect(tonik.months.map((m) => [m.month, m.inflow])).toEqual([['2026-04', 250], ['2026-05', 0]])
    expect(tonik.totalInflow).toBe(250)
  })

  it('averages monthly expenses over the last 3 full PH months of net-worth accounts', async () => {
    const r = await getSavingsFlows('user-1', {})
    expect(r.averageMonthlyExpenses).toEqual({ amount: 10000, monthsUsed: 3 })

    const agg = vi.mocked(db.expenseTransaction.aggregate).mock.calls[0][0] as any
    expect(agg.where.userId).toBe('user-1')
    expect(agg.where.isInstallment).toBe(false)
    expect(agg.where.account).toEqual({ addToNetWorth: true })
    expect(agg.where.date.gte.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(agg.where.date.lt.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('only divides by months on or after the first expense, and is null with no history', async () => {
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({ date: day('2026-03-02') } as any)
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('9000') } } as any)
    expect((await getSavingsFlows('user-1', {})).averageMonthlyExpenses).toEqual({ amount: 4500, monthsUsed: 2 })

    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue(null)
    expect((await getSavingsFlows('user-1', {})).averageMonthlyExpenses).toEqual({ amount: null, monthsUsed: 0 })
  })
})
