/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    expenseType: { findMany: vi.fn() },
    expenseSubcategory: { findMany: vi.fn() },
    financialAccount: { findMany: vi.fn() },
    expenseTransaction: { groupBy: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  },
}))

import { db } from '@/lib/prisma'
import { getSpendingBreakdown } from './spending'

const D = (v: string) => ({ toString: () => v })
const g = (expenseTypeId: string, date: string, amount: string) => ({
  expenseTypeId,
  date: new Date(date),
  _sum: { amount: D(amount) },
})

describe('getSpendingBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'))
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 't-food', name: 'Food' },
      { id: 't-fun', name: 'Fun' },
      { id: 't-unused', name: 'Unused' },
    ] as any)
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({ date: new Date('2026-01-03T00:00:00Z') } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scopes every query to the user and excludes installment parents', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([])
    await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05' })

    expect(db.expenseType.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }))
    expect(db.expenseTransaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', isInstallment: false } })
    )
    const call = vi.mocked(db.expenseTransaction.groupBy).mock.calls[0][0] as any
    expect(call.where.userId).toBe('user-1')
    expect(call.where.isInstallment).toBe(false)
  })

  it('buckets cron-timestamped rows into their UTC month and sums collisions', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      g('t-food', '2026-03-31T00:05:00Z', '100'),
      g('t-food', '2026-03-30T00:00:00Z', '50'),
      g('t-food', '2026-04-01T00:00:00Z', '25'),
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-03', to: '2026-04' })
    const food = r.groups.find((x) => x.name === 'Food')!
    expect(food.months).toEqual({ '2026-03': 150, '2026-04': 25 })
    expect(food.total).toBe(175)
  })

  it('computes the trailing 3 month average and change vs average for the latest month', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      g('t-food', '2026-02-10T00:00:00Z', '100'),
      g('t-food', '2026-03-10T00:00:00Z', '200'),
      g('t-food', '2026-04-10T00:00:00Z', '300'),
      g('t-food', '2026-05-10T00:00:00Z', '800'),
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05' })
    const food = r.groups[0]
    expect(food.months).toEqual({ '2026-05': 800 })
    expect(food.latestMonth.trailing3MonthAverage).toBe(200)
    expect(food.latestMonth.changeVsAverage).toEqual({ amount: 600, percent: 300 })
  })

  it('only averages trailing months that fall on or after the first transaction', async () => {
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({ date: new Date('2026-04-02T00:00:00Z') } as any)
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      g('t-food', '2026-04-10T00:00:00Z', '300'),
      g('t-food', '2026-05-10T00:00:00Z', '600'),
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05' })
    expect(r.trailingMonthsUsed).toEqual(['2026-04'])
    expect(r.groups[0].latestMonth.trailing3MonthAverage).toBe(300)
  })

  it('returns null comparisons when there is no history before the latest month', async () => {
    vi.mocked(db.expenseTransaction.findFirst).mockResolvedValue({ date: new Date('2026-05-02T00:00:00Z') } as any)
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([g('t-food', '2026-05-10T00:00:00Z', '600')] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05' })
    expect(r.groups[0].latestMonth.trailing3MonthAverage).toBeNull()
    expect(r.groups[0].latestMonth.changeVsAverage).toBeNull()
  })

  it('omits groups with no spend and sorts by total descending', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      g('t-fun', '2026-05-10T00:00:00Z', '10'),
      g('t-food', '2026-05-11T00:00:00Z', '500'),
      g('t-unused', '2026-05-12T00:00:00Z', '0'),
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05' })
    expect(r.groups.map((x) => x.name)).toEqual(['Food', 'Fun'])
  })

  it('filters by a category name case-insensitively', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([])
    await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05', category: 'fOOd' })
    const call = vi.mocked(db.expenseTransaction.groupBy).mock.calls[0][0] as any
    expect(call.where.expenseTypeId).toBe('t-food')
  })

  it('returns an empty result with a note for an unknown category', async () => {
    const r: any = await getSpendingBreakdown('user-1', { category: 'Nope' })
    expect(r.groups).toEqual([])
    expect(r.note).toMatch(/Nope/)
    expect(db.expenseTransaction.groupBy).not.toHaveBeenCalled()
  })

  it('groups by tag, counting a multi-tagged transaction under each tag and scoping tags to the user', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      {
        amount: D('100'),
        date: new Date('2026-05-02T00:00:00Z'),
        tags: [{ id: 'g1', name: 'Taiwan' }, { id: 'g2', name: 'Work' }],
      },
      { amount: D('40'), date: new Date('2026-05-03T00:00:00Z'), tags: [{ id: 'g1', name: 'Taiwan' }] },
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05', groupBy: 'tag' })
    expect(r.groups.map((x) => [x.name, x.total])).toEqual([['Taiwan', 140], ['Work', 100]])
    const call = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any
    expect(call.where.userId).toBe('user-1')
    expect(call.where.isInstallment).toBe(false)
    expect(call.where.tags).toEqual({ some: { userId: 'user-1' } })
  })

  it('labels subcategories with their category and handles rows without one', async () => {
    vi.mocked(db.expenseSubcategory.findMany).mockResolvedValue([
      { id: 's1', name: 'Coffee', expenseType: { name: 'Food' } },
    ] as any)
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseSubcategoryId: 's1', date: new Date('2026-05-02T00:00:00Z'), _sum: { amount: D('90') } },
      { expenseSubcategoryId: null, date: new Date('2026-05-02T00:00:00Z'), _sum: { amount: D('10') } },
    ] as any)

    const r = await getSpendingBreakdown('user-1', { from: '2026-05', to: '2026-05', groupBy: 'subcategory' })
    expect(r.groups.map((x) => x.name)).toEqual(['Food / Coffee', '(no subcategory)'])
  })

  it('does not report months after the current PH month', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([])
    const r = await getSpendingBreakdown('user-1', { from: '2026-04', to: '2026-09' })
    expect(r.window).toEqual({ from: '2026-04', to: '2026-05' })
  })
})
