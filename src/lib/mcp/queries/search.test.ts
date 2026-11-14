/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  db: {
    financialAccount: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
    expenseType: { findMany: vi.fn() },
    incomeType: { findMany: vi.fn() },
    transferType: { findMany: vi.fn() },
    expenseTransaction: { findMany: vi.fn(), aggregate: vi.fn() },
    incomeTransaction: { findMany: vi.fn(), aggregate: vi.fn() },
    transferTransaction: { findMany: vi.fn(), aggregate: vi.fn() },
  },
}))

import { db } from '@/lib/prisma'
import { searchTransactions } from './search'

const D = (v: string) => ({ toString: () => v })
const day = (s: string) => new Date(`${s}T00:00:00Z`)

const expenseRow = (name: string, amount: string, date: string, extra: Record<string, unknown> = {}) => ({
  name,
  description: null,
  amount: D(amount),
  date: day(date),
  account: { name: 'BPI' },
  expenseType: { name: 'Travel' },
  expenseSubcategory: { name: 'Flights' },
  tags: [{ name: 'Taiwan' }],
  ...extra,
})

const incomeRow = (name: string, amount: string, date: string) => ({
  name,
  description: 'pay',
  amount: D(amount),
  date: day(date),
  account: { name: 'BPI' },
  incomeType: { name: 'Salary' },
  tags: [],
})

const transferRow = (name: string, amount: number, date: string) => ({
  name,
  notes: null,
  amount,
  date: day(date),
  fromAccount: { name: 'BPI' },
  toAccount: { name: 'Tonik' },
  transferType: { name: 'Savings' },
  tags: [],
})

describe('searchTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.financialAccount.findMany).mockResolvedValue([{ id: 'a-bpi', name: 'BPI' }] as any)
    vi.mocked(db.tag.findMany).mockResolvedValue([{ id: 'tag-tw', name: 'Taiwan' }] as any)
    vi.mocked(db.expenseType.findMany).mockResolvedValue([{ id: 'et-travel', name: 'Travel' }] as any)
    vi.mocked(db.incomeType.findMany).mockResolvedValue([{ id: 'it-salary', name: 'Salary' }] as any)
    vi.mocked(db.transferType.findMany).mockResolvedValue([{ id: 'tt-sav', name: 'Savings' }] as any)
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([])
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([])
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([])
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('0') }, _count: 0 } as any)
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('0') }, _count: 0 } as any)
    vi.mocked(db.transferTransaction.aggregate).mockResolvedValue({ _sum: { amount: 0 }, _count: 0 } as any)
  })

  it('scopes every query to the user and excludes installment parents from expenses', async () => {
    await searchTransactions('user-1', {})
    const expenseWhere = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0]!.where as any
    expect(expenseWhere.userId).toBe('user-1')
    expect(expenseWhere.isInstallment).toBe(false)
    expect((vi.mocked(db.incomeTransaction.findMany).mock.calls[0][0]!.where as any).userId).toBe('user-1')
    expect((vi.mocked(db.transferTransaction.findMany).mock.calls[0][0]!.where as any).userId).toBe('user-1')
    expect((vi.mocked(db.expenseTransaction.aggregate).mock.calls[0][0] as any).where.isInstallment).toBe(false)
  })

  it('caps take at 50, defaults to 20 and fetches take + 1 rows per table', async () => {
    await searchTransactions('user-1', { kind: 'expense', take: 500 })
    expect((vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any).take).toBe(51)

    vi.clearAllMocks()
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([])
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: null }, _count: 0 } as any)
    await searchTransactions('user-1', { kind: 'expense' })
    expect((vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any).take).toBe(21)
  })

  it('fetches skip + take + 1 from each table when paging', async () => {
    await searchTransactions('user-1', { skip: 10, take: 5 })
    expect((vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any).take).toBe(16)
    expect((vi.mocked(db.incomeTransaction.findMany).mock.calls[0][0] as any).take).toBe(16)
    expect((vi.mocked(db.transferTransaction.findMany).mock.calls[0][0] as any).take).toBe(16)
  })

  it('reports hasMore and returns only the requested page', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([
      expenseRow('c', '3', '2026-03-03'),
      expenseRow('b', '2', '2026-03-02'),
      expenseRow('a', '1', '2026-03-01'),
    ] as any)
    const r = await searchTransactions('user-1', { kind: 'expense', take: 2 })
    expect(r.transactions.map((t) => t.name)).toEqual(['c', 'b'])
    expect(r.hasMore).toBe(true)

    const last = await searchTransactions('user-1', { kind: 'expense', take: 3 })
    expect(last.hasMore).toBe(false)
  })

  it('totals all matches, not just the page', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow('a', '100', '2026-03-01')] as any)
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('45250.75') }, _count: 37 } as any)

    const r = await searchTransactions('user-1', { kind: 'expense', tag: 'taiwan', take: 1 })
    expect(r.totalOfAllMatches).toBe(45250.75)
    expect(r.totals.expense).toEqual({ total: 45250.75, count: 37 })
    expect(r.count).toBe(37)
    expect(r.transactions).toHaveLength(1)
  })

  it('reports per-kind totals and a null combined total when searching all kinds', async () => {
    vi.mocked(db.expenseTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('10') }, _count: 1 } as any)
    vi.mocked(db.incomeTransaction.aggregate).mockResolvedValue({ _sum: { amount: D('50') }, _count: 1 } as any)
    const r = await searchTransactions('user-1', {})
    expect(r.totalOfAllMatches).toBeNull()
    expect(Object.keys(r.totals)).toEqual(['expense', 'income', 'transfer'])
  })

  it('resolves account, tag and category names case-insensitively within the user records', async () => {
    await searchTransactions('user-1', { kind: 'expense', account: 'bpi', tag: 'TAIWAN', category: 'travel' })

    expect(vi.mocked(db.financialAccount.findMany).mock.calls[0][0]).toMatchObject({ where: { userId: 'user-1' } })
    expect(vi.mocked(db.tag.findMany).mock.calls[0][0]).toMatchObject({ where: { userId: 'user-1' } })
    expect(vi.mocked(db.expenseType.findMany).mock.calls[0][0]).toMatchObject({ where: { userId: 'user-1' } })

    const where = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0]!.where as any
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { accountId: 'a-bpi' },
        { expenseTypeId: { in: ['et-travel'] } },
        { tags: { some: { id: { in: ['tag-tw'] } } } },
      ])
    )
  })

  it.each([
    ['account', { account: 'Nope' }],
    ['tag', { tag: 'Nope' }],
    ['category', { category: 'Nope' }],
  ])('returns an empty result with a note for an unknown %s instead of ignoring the filter', async (_label, args) => {
    const r: any = await searchTransactions('user-1', args)
    expect(r.transactions).toEqual([])
    expect(r.count).toBe(0)
    expect(r.note).toMatch(/Nope/)
    expect(db.expenseTransaction.findMany).not.toHaveBeenCalled()
    expect(db.expenseTransaction.aggregate).not.toHaveBeenCalled()
  })

  it('only searches kinds that have the named category', async () => {
    vi.mocked(db.expenseType.findMany).mockResolvedValue([{ id: 'et-sal', name: 'Salary' }] as any)
    const r = await searchTransactions('user-1', { category: 'salary' })
    expect(Object.keys(r.totals)).toEqual(['expense', 'income'])
    expect(db.transferTransaction.findMany).not.toHaveBeenCalled()
  })

  it('applies date and amount filters through the shared where-builders', async () => {
    await searchTransactions('user-1', { kind: 'expense', from: '2026-03-01', to: '2026-03-31', minAmount: 100, maxAmount: 500.5 })
    const where = vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0]!.where as any
    const date = where.AND.find((c: any) => c.date).date
    expect(date.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z')
    expect(date.lte.toISOString()).toBe('2026-03-31T23:59:59.999Z')
    const amount = where.AND.find((c: any) => c.amount).amount
    expect(amount.gte.toString()).toBe('100')
    expect(amount.lte.toString()).toBe('500.5')
  })

  it('sorts by amount descending across kinds', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow('e-small', '10', '2026-03-05')] as any)
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([incomeRow('i-mid', '500', '2026-03-01')] as any)
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow('t-big', 9000, '2026-03-02')] as any)

    const r = await searchTransactions('user-1', { sort: 'amount' })
    expect(r.transactions.map((t) => t.name)).toEqual(['t-big', 'i-mid', 'e-small'])
    expect((vi.mocked(db.expenseTransaction.findMany).mock.calls[0][0] as any).orderBy[0]).toEqual({ amount: 'desc' })
  })

  it('sorts by date descending by default and shapes rows for each kind', async () => {
    vi.mocked(db.expenseTransaction.findMany).mockResolvedValue([expenseRow('flight', '12000.5', '2026-03-05')] as any)
    vi.mocked(db.incomeTransaction.findMany).mockResolvedValue([incomeRow('salary', '50000', '2026-03-15')] as any)
    vi.mocked(db.transferTransaction.findMany).mockResolvedValue([transferRow('to savings', 5000, '2026-03-10')] as any)

    const r = await searchTransactions('user-1', {})
    expect(r.transactions.map((t) => t.name)).toEqual(['salary', 'to savings', 'flight'])
    expect(r.transactions[2]).toEqual({
      date: '2026-03-05',
      kind: 'expense',
      name: 'flight',
      description: null,
      amount: 12000.5,
      category: 'Travel',
      subcategory: 'Flights',
      account: 'BPI',
      tags: ['Taiwan'],
    })
    expect(r.transactions[1]).toMatchObject({ kind: 'transfer', account: 'BPI -> Tonik', category: 'Savings', amount: 5000 })
  })
})
