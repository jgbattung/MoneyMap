/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: { financialAccount: { findMany: vi.fn() } },
}))

import { db } from '@/lib/prisma'
import { getCreditCards } from './cards'

const D = (v: string) => ({ toString: () => v })

const card = (over: Record<string, unknown> = {}) => ({
  name: 'BPI Gold',
  cardGroup: 'BPI',
  currentBalance: D('-12000.50'),
  statementBalance: D('9000'),
  previousStatementBalance: D('3000'),
  statementDate: 5,
  dueDate: 25,
  ...over,
})

describe('getCreditCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scopes to the user and credit cards only', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([])
    await getCreditCards('user-1')
    expect(vi.mocked(db.financialAccount.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-1', accountType: 'CREDIT_CARD' },
    })
  })

  it('keeps the cards route sign convention: negative balance is owed, totalOwed is positive', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      card(),
      card({ name: 'Metrobank', currentBalance: D('-4000'), cardGroup: null }),
      card({ name: 'Overpaid', currentBalance: D('250') }),
    ] as any)

    const r = await getCreditCards('user-1')
    expect(r.cards.map((c) => [c.name, c.balance, c.owed])).toEqual([
      ['BPI Gold', -12000.5, 12000.5],
      ['Metrobank', -4000, 4000],
      ['Overpaid', 250, 0],
    ])
    expect(r.totalOwed).toBe(16000.5)
  })

  it('uses a due date later this month when it has not passed', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 25 })] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c.nextDueDate).toBe('2026-04-25')
    expect(c.daysUntilDue).toBe(15)
  })

  it('is due today with 0 days left on the due day itself', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 10 })] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c.nextDueDate).toBe('2026-04-10')
    expect(c.daysUntilDue).toBe(0)
  })

  it('rolls to next month once the due day has passed', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 3 })] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c.nextDueDate).toBe('2026-05-03')
    expect(c.daysUntilDue).toBe(23)
  })

  it('clamps a due day of 31 in a 30-day month', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 31 })] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c.nextDueDate).toBe('2026-04-30')
    expect(c.daysUntilDue).toBe(20)
  })

  it('clamps day 30 into February when rolling over', async () => {
    vi.setSystemTime(new Date('2026-01-31T00:00:00Z'))
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 30 })] as any)
    // Jan 30 has passed -> next is Feb 28 (2026 is not a leap year)
    expect((await getCreditCards('user-1')).cards[0].nextDueDate).toBe('2026-02-28')
  })

  it('computes the due date in PH time at the month boundary', async () => {
    vi.setSystemTime(new Date('2026-04-30T16:00:00Z')) // already 2026-05-01 in PH
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([card({ dueDate: 30 })] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c.nextDueDate).toBe('2026-05-30')
    expect(c.daysUntilDue).toBe(29)
  })

  it('returns null due fields and null statement balances when not set', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      card({ dueDate: null, statementDate: null, statementBalance: null, previousStatementBalance: null }),
    ] as any)
    const c = (await getCreditCards('user-1')).cards[0]
    expect(c).toMatchObject({
      nextDueDate: null, daysUntilDue: null, statementBalance: null, previousStatementBalance: null,
    })
  })
})
