/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: { expenseTransaction: { findMany: vi.fn() } },
}))

import { db } from '@/lib/prisma'
import { getInstallments } from './installments'

const D = (v: string) => ({ toString: () => v })
const at = (s: string) => new Date(`${s}T00:00:00Z`)

const inst = (over: Record<string, unknown> = {}) => ({
  name: 'Laptop',
  amount: D('12000'),
  monthlyAmount: D('1000'),
  installmentDuration: 12,
  remainingInstallments: 9,
  installmentStartDate: at('2026-01-10'),
  lastProcessedDate: at('2026-03-31'),
  installmentStatus: 'ACTIVE',
  account: { name: 'BPI Gold' },
  ...over,
})

describe('getInstallments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads only the user installment parents, active by default', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([])
    await getInstallments('user-1', {})
    const call = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any
    expect(call.where).toEqual({ userId: 'user-1', isInstallment: true, installmentStatus: 'ACTIVE' })
  })

  it('includes completed plans for status ALL, never cancelled', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([])
    await getInstallments('user-1', { status: 'ALL' })
    const call = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any
    expect(call.where.installmentStatus).toEqual({ in: ['ACTIVE', 'COMPLETED'] })
  })

  it('derives paymentsMade, paymentsLeft and amountLeft from the installment fields', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([inst()] as any)
    const i = (await getInstallments('user-1', {})).installments[0]
    expect(i).toMatchObject({
      name: 'Laptop',
      account: 'BPI Gold',
      monthlyAmount: 1000,
      totalAmount: 12000,
      paymentsMade: 3,
      paymentsLeft: 9,
      amountLeft: 9000,
      startDate: '2026-01-10',
      status: 'ACTIVE',
    })
  })

  it('estimates the final payment month from the last posted payment', async () => {
    // 9 left x 30 days after 2026-03-31 = 2026-12-26
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([inst()] as any)
    expect((await getInstallments('user-1', {})).installments[0].expectedEndMonth).toBe('2026-12')
  })

  it('estimates from the start date for a plan that has not posted yet', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      inst({ lastProcessedDate: null, remainingInstallments: 12, installmentStartDate: at('2026-06-01') }),
    ] as any)
    // start + 11 x 30 days = 2027-04-27
    expect((await getInstallments('user-1', {})).installments[0].expectedEndMonth).toBe('2027-04')
  })

  it('counts next-month commitments but excludes plans whose last payment is this month', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      inst({ name: 'Long', monthlyAmount: D('1000') }),
      // 1 left, last posted 2026-04-02 -> final payment 2026-05-02 -> still pays in May
      inst({ name: 'EndsMay', monthlyAmount: D('500'), remainingInstallments: 1, lastProcessedDate: at('2026-04-02') }),
      // 1 left, last posted 2026-03-20 -> final payment 2026-04-19 -> ends this month
      inst({ name: 'EndsApril', monthlyAmount: D('700'), remainingInstallments: 1, lastProcessedDate: at('2026-03-20') }),
    ] as any)

    const r = await getInstallments('user-1', {})
    expect(r.committedNextMonth).toBe(1500)
    expect(r.totalMonthly).toBe(2200)
  })

  it('excludes completed plans from the commitments and monthly total', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      inst({ installmentStatus: 'COMPLETED', remainingInstallments: 0 }),
    ] as any)
    const r = await getInstallments('user-1', { status: 'ALL' })
    expect(r.committedNextMonth).toBe(0)
    expect(r.totalMonthly).toBe(0)
    expect(r.installments[0]).toMatchObject({ paymentsLeft: 0, amountLeft: 0, expectedEndMonth: null, paymentsMade: 12 })
  })
})
