import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ReportsLoading from './loading'

describe('ReportsLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<ReportsLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-32)', () => {
    const { container } = render(<ReportsLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-32')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the net worth summary card skeleton (h-32 w-full)', () => {
    const { container } = render(<ReportsLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasNetWorthSkeleton = Array.from(skeletons).some(el =>
      el.className.includes('h-32') && el.className.includes('w-full')
    )
    expect(hasNetWorthSkeleton).toBe(true)
  })

  it('renders the category breakdown card section', () => {
    const { container } = render(<ReportsLoading />)
    // The category breakdown container has bg-card and border-border
    const breakdownCard = container.querySelector('.bg-card.border.border-border')
    expect(breakdownCard).not.toBeNull()
  })

  it('renders the category breakdown heading skeleton (h-5 w-44)', () => {
    const { container } = render(<ReportsLoading />)
    const headingSkeleton = container.querySelector('.h-5.w-44')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the category breakdown filter skeleton (h-9 w-44)', () => {
    const { container } = render(<ReportsLoading />)
    const filterSkeleton = container.querySelector('.h-9.w-44')
    expect(filterSkeleton).not.toBeNull()
  })

  it('renders the category tab bar skeleton (h-8 w-full)', () => {
    const { container } = render(<ReportsLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasTabBar = Array.from(skeletons).some(el =>
      el.className.includes('h-8') && el.className.includes('w-full')
    )
    expect(hasTabBar).toBe(true)
  })

  it('renders the category chart skeleton (h-[300px])', () => {
    const { container } = render(<ReportsLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasChartSkeleton = Array.from(skeletons).some(el =>
      el.className.includes('h-[300px]')
    )
    expect(hasChartSkeleton).toBe(true)
  })

  it('renders the annual summary table section heading skeleton (h-6 w-36)', () => {
    const { container } = render(<ReportsLoading />)
    const headingSkeleton = container.querySelector('.h-6.w-36')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the annual summary table skeleton (h-[300px] w-full)', () => {
    const { container } = render(<ReportsLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const tableSkeletons = Array.from(skeletons).filter(el =>
      el.className.includes('h-[300px]')
    )
    // There should be exactly 2: the chart skeleton and the annual table skeleton
    expect(tableSkeletons.length).toBe(2)
  })

  it('renders all skeletons inside a mt-10 space-y-6 wrapper', () => {
    const { container } = render(<ReportsLoading />)
    const contentWrapper = container.querySelector('.mt-10.space-y-6')
    expect(contentWrapper).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<ReportsLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
