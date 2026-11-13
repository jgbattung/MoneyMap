/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/net-worth', () => ({
  calculateMonthlyChange: vi.fn(),
}))

import { db } from '@/lib/prisma'
import { calculateMonthlyChange } from '@/lib/net-worth'
import { getSnapshot } from './snapshot'

const D = (v: string) => ({ toString: () => v })

describe('getSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      { name: 'BPI', accountType: 'CHECKING', currentBalance: D('10000.50'), addToNetWorth: true },
      { name: 'Tonik', accountType: 'SAVINGS', currentBalance: D('50000'), addToNetWorth: true },
      { name: 'Card', accountType: 'CREDIT_CARD', currentBalance: D('-5000'), addToNetWorth: true },
      { name: 'Wallet', accountType: 'CASH', currentBalance: D('999'), addToNetWorth: false },
    ] as any)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      netWorthTarget: D('1000000'),
      netWorthTargetDate: new Date('2027-12-31T00:00:00Z'),
    } as any)
    vi.mocked(calculateMonthlyChange).mockResolvedValue({ change: 5000, percentage: 0 })
  })

  it('scopes every read to the user', async () => {
    await getSnapshot('user-1')
    expect(db.financialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } })
    )
    expect(calculateMonthlyChange).toHaveBeenCalledWith('user-1', expect.any(Number))
  })

  it('sums net worth over net-worth accounts only and flags the rest', async () => {
    const r = await getSnapshot('user-1')
    expect(r.netWorth).toBe(55000.5)
    expect(r.accounts).toHaveLength(4)
    expect(r.accounts.find((a) => a.name === 'Wallet')?.countsTowardNetWorth).toBe(false)
    expect(r.totalsByType).toEqual({ CHECKING: 10000.5, SAVINGS: 50000, CREDIT_CARD: -5000 })
  })

  it('derives the monthly percentage from the net change', async () => {
    const r = await getSnapshot('user-1')
    // previous = 55000.5 - 5000 = 50000.5 -> 5000 / 50000.5 = 10%
    expect(r.monthlyChange).toEqual({ amount: 5000, percentage: 10 })
  })

  it('returns the target and null when none is set', async () => {
    expect((await getSnapshot('user-1')).netWorthTarget).toEqual({
      target: 1000000,
      targetDate: '2027-12-31',
    })

    vi.mocked(db.user.findUnique).mockResolvedValue({ netWorthTarget: null, netWorthTargetDate: null } as any)
    expect((await getSnapshot('user-1')).netWorthTarget).toBeNull()
  })

  it('returns plain numbers, never Decimal strings', async () => {
    const r = await getSnapshot('user-1')
    expect(typeof r.netWorth).toBe('number')
    expect(r.accounts.every((a) => typeof a.balance === 'number')).toBe(true)
  })
})
