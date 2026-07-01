import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import React from 'react'
import BudgetsTable from './BudgetsTable'
import type { BudgetStatusItem } from '@/hooks/useBudgetStatus'

vi.mock('@/hooks/useExpenseTypesQuery', () => ({
  useExpenseTypesQuery: () => ({ updateBudget: vi.fn(), isUpdating: false }),
}))

const budgets: BudgetStatusItem[] = [
  { id: '1', name: 'Rent', monthlyBudget: 20000, spentAmount: 20000, progressPercentage: 100, isOverBudget: false },
  { id: '2', name: 'Food', monthlyBudget: 8000, spentAmount: 9500, progressPercentage: 118.75, isOverBudget: true },
  { id: '3', name: 'Misc', monthlyBudget: null, spentAmount: 1200, progressPercentage: 0, isOverBudget: false },
]

const renderTable = () =>
  render(<BudgetsTable budgets={budgets} onRowClick={() => {}} />)

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

  it('enters inline edit mode when the row edit button is clicked', () => {
    renderTable()
    const editButtons = screen.getAllByLabelText('Edit budget')
    expect(editButtons.length).toBe(3)
    fireEvent.click(editButtons[0])
    expect(screen.getByLabelText('Save')).toBeTruthy()
    expect(screen.getByLabelText('Cancel')).toBeTruthy()
    expect(screen.getByLabelText('Delete budget')).toBeTruthy()
  })

  it('renders the overall percentage in the footer', () => {
    const { container } = renderTable()
    const footer = container.querySelector('tfoot')
    expect(footer).toBeTruthy()
    // 30,700 / 28,000 = 109.6% -> 110%
    expect(within(footer as HTMLElement).getByText('110%')).toBeTruthy()
  })
})
