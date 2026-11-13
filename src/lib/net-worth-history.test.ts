/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

import { db } from '@/lib/prisma'
import { getMonthlyFlowAggregates } from './net-worth-history'

describe('getMonthlyFlowAggregates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when the user has no net-worth accounts', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([])
    expect(await getMonthlyFlowAggregates('user-1')).toBeNull()
    expect(db.$queryRaw).not.toHaveBeenCalled()
  })

  it('scopes accounts to the user and net-worth accounts', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([])
    await getMonthlyFlowAggregates('user-1')
    expect(db.financialAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', addToNetWorth: true } })
    )
  })

  it('filters both raw queries by user and excludes installment parents from expenses', async () => {
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([
      { id: 'a1', initialBalance: { toString: () => '100.50' } },
      { id: 'a2', initialBalance: { toString: () => '200' } },
    ] as any)
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([{ year: 2026, month: 1, total: 10 }] as any)
      .mockResolvedValueOnce([{ year: 2026, month: 1, total: 4 }] as any)

    const result = await getMonthlyFlowAggregates('user-1')

    expect(result).toEqual({
      totalInitialBalance: 300.5,
      incomeRows: [{ year: 2026, month: 1, total: 10 }],
      expenseRows: [{ year: 2026, month: 1, total: 4 }],
    })

    const [incomeCall, expenseCall] = vi.mocked(db.$queryRaw).mock.calls as any[][]
    expect(incomeCall[0].join('?')).toContain('income_transactions')
    expect(expenseCall[0].join('?')).toContain('expense_transactions')
    expect(expenseCall[0].join('?')).toContain('is_installment = false')
    expect(incomeCall.slice(1)).toEqual(['user-1', ['a1', 'a2']])
    expect(expenseCall.slice(1)).toEqual(['user-1', ['a1', 'a2']])
  })
})
