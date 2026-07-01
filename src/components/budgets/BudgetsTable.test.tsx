import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'
import BudgetsTable, { type BudgetTotals } from './BudgetsTable'
import type { BudgetStatusItem } from '@/hooks/useBudgetStatus'

const budgets: BudgetStatusItem[] = [
  { id: '1', name: 'Rent', monthlyBudget: 20000, spentAmount: 20000, progressPercentage: 100, isOverBudget: false },
  { id: '2', name: 'Food', monthlyBudget: 8000, spentAmount: 9500, progressPercentage: 118.75, isOverBudget: true },
  { id: '3', name: 'Misc', monthlyBudget: null, spentAmount: 1200, progressPercentage: 0, isOverBudget: false },
]

const totals: BudgetTotals = {
  totalBudgeted: 28000,
  totalSpent: 30700,
  totalRemaining: -2700,
}

const renderTable = () =>
  render(<BudgetsTable budgets={budgets} totals={totals} onRowClick={() => {}} />)

describe('BudgetsTable', () => {
  it('renders a row per category with budgeted, spent and remaining', () => {
    renderTable()
    expect(screen.getByText('Rent')).toBeTruthy()
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByText('Misc')).toBeTruthy()
    // Rent: budget 20,000 and spent 20,000 both render as ₱20,000.00
    expect(screen.getAllByText('₱20,000.00').length).toBe(2)
  })

  it('shows an em dash for categories without a budget', () => {
    renderTable()
    // Misc has no budget: budgeted and remaining are "—"
    expect(screen.getAllByText('—').length).toBe(2)
  })

  it('renders the totals footer with budgeted, spent and a negative remaining', () => {
    renderTable()
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('₱28,000.00')).toBeTruthy() // total budgeted
    expect(screen.getByText('₱30,700.00')).toBeTruthy() // total spent
    expect(screen.getByText('-₱2,700.00')).toBeTruthy() // total remaining (over)
  })

  it('shows an over-budget row remaining as a negative peso value', () => {
    renderTable()
    // Food is over by 1,500 -> remaining -1,500.00
    expect(screen.getByText('-₱1,500.00')).toBeTruthy()
  })

  it('renders the overall percentage in the footer', () => {
    const { container } = renderTable()
    const footer = container.querySelector('tfoot')
    expect(footer).toBeTruthy()
    // 30,700 / 28,000 = 109.6% -> 110%
    expect(within(footer as HTMLElement).getByText('110%')).toBeTruthy()
  })
})
