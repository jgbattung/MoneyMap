/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    expenseType: { findMany: vi.fn() },
    expenseTransaction: { groupBy: vi.fn() },
  },
}))

import { db } from '@/lib/prisma'
import { getBudgetStatus } from './budget'

const D = (v: string) => ({ toString: () => v })

describe('getBudgetStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // 2026-04-10 in PH (still 2026-04-10 at 00:00 UTC + 8h): day 10 of a 30 day month
    vi.setSystemTime(new Date('2026-04-10T00:00:00Z'))
    vi.mocked(db.expenseType.findMany).mockResolvedValue([
      { id: 't-food', name: 'Food', monthlyBudget: D('3000') },
      { id: 't-fun', name: 'Fun', monthlyBudget: D('1000') },
      { id: 't-gas', name: 'Gas', monthlyBudget: null },
      { id: 't-zero', name: 'Zero', monthlyBudget: D('0') },
      { id: 't-idle', name: 'Idle', monthlyBudget: D('500') },
    ] as any)
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 't-food', _sum: { amount: D('1500') } },
      { expenseTypeId: 't-fun', _sum: { amount: D('100') } },
      { expenseTypeId: 't-gas', _sum: { amount: D('800') } },
      { expenseTypeId: 't-zero', _sum: { amount: D('50') } },
    ] as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scopes to the user, excludes installment parents and uses the month range', async () => {
    await getBudgetStatus('user-1', {})
    expect(db.expenseType.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }))
    const call = vi.mocked(db.expenseTransaction.groupBy).mock.calls[0][0] as any
    expect(call.where.userId).toBe('user-1')
    expect(call.where.isInstallment).toBe(false)
    expect(call.where.date.gte.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(call.where.date.lt.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('projects the current month pro-rata over PH days elapsed', async () => {
    const r = await getBudgetStatus('user-1', {})
    expect(r.isCurrentMonth).toBe(true)
    expect(r.daysElapsed).toBe(10)
    const food = r.budgeted.find((b) => b.category === 'Food')!
    // 1500 / 10 * 30 = 4500 -> over by 1500
    expect(food).toMatchObject({
      budget: 3000, spent: 1500, remaining: 1500, percentUsed: 50, projectedMonthEnd: 4500, projectedOverBy: 1500,
    })
    const fun = r.budgeted.find((b) => b.category === 'Fun')!
    expect(fun.projectedMonthEnd).toBe(300)
    expect(fun.projectedOverBy).toBe(0)
  })

  it('uses the PH day, which is ahead of UTC late in the day', async () => {
    vi.setSystemTime(new Date('2026-04-10T16:30:00Z')) // already 2026-04-11 in PH
    const r = await getBudgetStatus('user-1', {})
    expect(r.daysElapsed).toBe(11)
  })

  it('projects a past month to exactly what was spent', async () => {
    const r = await getBudgetStatus('user-1', { month: '2026-03' })
    expect(r.isCurrentMonth).toBe(false)
    const food = r.budgeted.find((b) => b.category === 'Food')!
    expect(food.projectedMonthEnd).toBe(1500)
    expect(food.projectedOverBy).toBe(0)
  })

  it('lists budgeted categories with zero spend and omits zero-spend unbudgeted ones', async () => {
    const r = await getBudgetStatus('user-1', {})
    expect(r.budgeted.find((b) => b.category === 'Idle')).toMatchObject({ spent: 0, percentUsed: 0, remaining: 500 })
    expect(r.unbudgeted.map((u) => u.category)).toEqual(['Gas', 'Zero'])
  })

  it('treats a zero budget as unbudgeted', async () => {
    const r = await getBudgetStatus('user-1', {})
    expect(r.budgeted.find((b) => b.category === 'Zero')).toBeUndefined()
  })

  it('reports a negative remaining when over budget, sorted by percent used', async () => {
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([
      { expenseTypeId: 't-fun', _sum: { amount: D('1500') } },
      { expenseTypeId: 't-food', _sum: { amount: D('300') } },
    ] as any)
    const r = await getBudgetStatus('user-1', { month: '2026-03' })
    expect(r.budgeted[0]).toMatchObject({ category: 'Fun', remaining: -500, percentUsed: 150 })
    expect(r.totalBudget).toBe(4500)
  })
})
