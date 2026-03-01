import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BudgetsLoading from './loading'

describe('BudgetsLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<BudgetsLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-28)', () => {
    const { container } = render(<BudgetsLoading />)
    // Both title and button use w-28; pick by h-10
    const titleSkeleton = container.querySelector('.h-10.w-28')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the add-budget button skeleton (h-9 w-28)', () => {
    const { container } = render(<BudgetsLoading />)
    const buttonSkeleton = container.querySelector('.h-9.w-28')
    expect(buttonSkeleton).not.toBeNull()
  })

  it('renders 4 SkeletonBudgetCard instances', () => {
    const { container } = render(<BudgetsLoading />)
    // Each SkeletonBudgetCard has 6 Skeleton children
    // Total: title(1) + button(1) + 4 cards * 6 skeletons each = 26
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(26)
  })

  it('renders the budget card grid with correct class structure', () => {
    const { container } = render(<BudgetsLoading />)
    const grid = container.querySelector('.grid.grid-cols-1')
    expect(grid).not.toBeNull()
    expect(grid!.className).toContain('gap-4')
    expect(grid!.className).toContain('mt-10')
  })

  it('renders a header row with space-between layout', () => {
    const { container } = render(<BudgetsLoading />)
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<BudgetsLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
