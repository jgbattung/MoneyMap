/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    payDivision: { findMany: vi.fn() },
    incomeTransaction: { groupBy: vi.fn() },
    expenseTransaction: { groupBy: vi.fn() },
    transferTransaction: { groupBy: vi.fn() },
  },
}))

import { db } from '@/lib/prisma'
import { getPayPlanAdherence } from './pay-plans'

const D = (v: string) => ({ toString: () => v })
const day = (s: string) => new Date(`${s}T00:00:00Z`)

const transferItem = (over: Record<string, unknown> = {}) => ({
  kind: 'TRANSFER',
  amount: D('10000'),
  completedAt: null,
  transferTransactionId: null,
  transferTransaction: null,
  toAccountId: 'tonik',
  toAccount: { accountType: 'SAVINGS' },
  ...over,
})

const division = (payDate: string, items: unknown[]) => ({
  payDate: day(payDate),
  planName: 'Main',
  payAmount: D('50000'),
  savePercent: D('20'),
  saveAmount: D('10000'),
  items,
})

describe('getPayPlanAdherence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.incomeTransaction.groupBy).mockResolvedValue([])
    vi.mocked(db.expenseTransaction.groupBy).mockResolvedValue([])
    vi.mocked(db.transferTransaction.groupBy).mockResolvedValue([])
  })

  it('scopes to the user and caps the limit', async () => {
    vi.mocked(db.payDivision.findMany).mockResolvedValue([])
    await getPayPlanAdherence('user-1', { limit: 500 })
    const call = vi.mocked(db.payDivision.findMany).mock.calls[0][0] as any
    expect(call.where).toEqual({ userId: 'user-1' })
    expect(call.take).toBe(20)
    expect(db.transferTransaction.groupBy).not.toHaveBeenCalled()
  })

  it('sums only recorded TRANSFER items, using the recorded transfer amount', async () => {
    vi.mocked(db.payDivision.findMany).mockResolvedValue([
      division('2026-05-15', [
        transferItem({ transferTransactionId: 't1', transferTransaction: { amount: 9500 } }),
        transferItem({ label: 'Spending', amount: D('30000'), toAccountId: 'bpi', toAccount: { accountType: 'CHECKING' } }),
        { kind: 'EARMARK', amount: D('2000'), completedAt: new Date(), transferTransactionId: null, transferTransaction: null, toAccountId: null, toAccount: null },
        { kind: 'EARMARK', amount: D('3000'), completedAt: null, transferTransactionId: null, transferTransaction: null, toAccountId: null, toAccount: null },
      ]),
    ] as any)

    const r = await getPayPlanAdherence('user-1', {})
    const d = r.divisions[0]
    expect(d).toMatchObject({
      payDate: '2026-05-15',
      planName: 'Main',
      payAmount: 50000,
      savePercent: 20,
      plannedSave: 10000,
      plannedTransfers: 40000,
      completedTransfers: 9500,
      pendingTransfers: 1,
      pendingEarmarks: 1,
    })
  })

  it('measures net inflow into save accounts between this pay date and the next division', async () => {
    vi.mocked(db.payDivision.findMany).mockResolvedValue([
      division('2026-05-15', [transferItem()]),
      division('2026-04-30', [transferItem()]),
    ] as any)
    vi.mocked(db.transferTransaction.groupBy)
      .mockResolvedValueOnce([
        { toAccountId: 'tonik', date: day('2026-04-30'), _sum: { amount: 10000 } }, // in older window
        { toAccountId: 'tonik', date: day('2026-05-14'), _sum: { amount: 500 } }, // in older window (before 05-15)
        { toAccountId: 'tonik', date: day('2026-05-15'), _sum: { amount: 8000 } }, // newest window
        { toAccountId: 'other', date: day('2026-05-15'), _sum: { amount: 99999 } }, // not a target
      ] as any)
      .mockResolvedValueOnce([{ fromAccountId: 'tonik', date: day('2026-05-20'), _sum: { amount: 1000 } }] as any)

    const r = await getPayPlanAdherence('user-1', {})
    expect(r.divisions[0].actualIntoSaveAccounts).toBe(7000) // 8000 in - 1000 out, open-ended window
    expect(r.divisions[0].windowEnd).toBeNull()
    expect(r.divisions[1].actualIntoSaveAccounts).toBe(10500)
    expect(r.divisions[1].windowEnd).toBe('2026-05-15')
  })

  it('ignores TRANSFER targets that are not SAVINGS, INVESTMENT or RETIREMENT', async () => {
    vi.mocked(db.payDivision.findMany).mockResolvedValue([
      division('2026-05-15', [transferItem({ toAccountId: 'bpi', toAccount: { accountType: 'CHECKING' } })]),
    ] as any)
    vi.mocked(db.transferTransaction.groupBy)
      .mockResolvedValueOnce([{ toAccountId: 'bpi', date: day('2026-05-16'), _sum: { amount: 5000 } }] as any)
      .mockResolvedValueOnce([])
    const r = await getPayPlanAdherence('user-1', {})
    expect(r.divisions[0].actualIntoSaveAccounts).toBe(0)
  })
})
