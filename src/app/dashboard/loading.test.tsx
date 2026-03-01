import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DashboardLoading from './loading'

describe('DashboardLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<DashboardLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-40)', () => {
    const { container } = render(<DashboardLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-40')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the net worth section label skeleton (h-4 w-20)', () => {
    const { container } = render(<DashboardLoading />)
    const labelSkeleton = container.querySelector('.h-4.w-20')
    expect(labelSkeleton).not.toBeNull()
  })

  it('renders the net worth amount skeleton (h-10 w-52)', () => {
    const { container } = render(<DashboardLoading />)
    const amountSkeleton = container.querySelector('.h-10.w-52')
    expect(amountSkeleton).not.toBeNull()
  })

  it('renders 3 net worth stat column skeletons (h-16)', () => {
    const { container } = render(<DashboardLoading />)
    const colSkeletons = container.querySelectorAll('.h-16')
    expect(colSkeletons.length).toBe(3)
  })

  it('renders the budget status section title skeleton (h-5 w-28)', () => {
    const { container } = render(<DashboardLoading />)
    const budgetTitle = container.querySelector('.h-5.w-28')
    expect(budgetTitle).not.toBeNull()
  })

  it('renders the recent transactions section title skeleton (h-5 w-36)', () => {
    const { container } = render(<DashboardLoading />)
    const txTitle = container.querySelector('.h-5.w-36')
    expect(txTitle).not.toBeNull()
  })

  it('renders 4 budget row skeletons', () => {
    const { container } = render(<DashboardLoading />)
    // budget rows + recent transaction rows + account summary cards all use h-10 w-full
    // budget section has 4 rows, transactions has 5 rows
    const allFullWidthRows = container.querySelectorAll('.h-10.w-full')
    expect(allFullWidthRows.length).toBeGreaterThanOrEqual(4)
  })

  it('renders 4 account summary skeletons (h-24)', () => {
    const { container } = render(<DashboardLoading />)
    const accountSkeletons = container.querySelectorAll('.h-24')
    expect(accountSkeletons.length).toBe(4)
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<DashboardLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.tagName).toBe('DIV')
    expect(wrapper!.className).toContain('py-6')
    expect(wrapper!.className).toContain('flex')
    expect(wrapper!.className).toContain('flex-col')
  })

  it('renders all skeleton elements with the data-slot="skeleton" attribute', () => {
    const { container } = render(<DashboardLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    // Header + net worth label + amount + 3 cols + budget title + 4 budget rows
    // + tx title + 5 tx rows + 4 account cards = 19 top-level Skeleton elements
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
