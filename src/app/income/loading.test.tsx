import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import IncomeLoading from './loading'

describe('IncomeLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<IncomeLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-28)', () => {
    const { container } = render(<IncomeLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-28')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the action button skeleton (h-9 w-40)', () => {
    const { container } = render(<IncomeLoading />)
    const buttonSkeleton = container.querySelector('.h-9.w-40')
    expect(buttonSkeleton).not.toBeNull()
  })

  it('renders the header row with space-between layout', () => {
    const { container } = render(<IncomeLoading />)
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).not.toBeNull()
  })

  it('renders the income categories section heading skeleton (h-6 w-44)', () => {
    const { container } = render(<IncomeLoading />)
    const headingSkeleton = container.querySelector('.h-6.w-44')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the income categories section description skeleton (h-4 w-72)', () => {
    const { container } = render(<IncomeLoading />)
    const descSkeleton = container.querySelector('.h-4.w-72')
    expect(descSkeleton).not.toBeNull()
  })

  it('renders 3 SkeletonIncomeTypeCard instances in the categories grid', () => {
    const { container } = render(<IncomeLoading />)
    // Categories grid: md:grid-cols-2 lg:grid-cols-3
    const categoriesGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')
    expect(categoriesGrid).not.toBeNull()
    const skeletons = categoriesGrid!.querySelectorAll('[data-slot="skeleton"]')
    // 3 SkeletonIncomeTypeCard * 5 skeletons each = 15
    expect(skeletons.length).toBe(15)
  })

  it('renders the income transactions section heading skeleton (h-6 w-48)', () => {
    const { container } = render(<IncomeLoading />)
    const headingSkeleton = container.querySelector('.h-6.w-48')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the income transactions section description skeleton (h-4 w-64)', () => {
    const { container } = render(<IncomeLoading />)
    const descSkeleton = container.querySelector('.h-4.w-64')
    expect(descSkeleton).not.toBeNull()
  })

  it('renders the mobile transaction card list (md:hidden)', () => {
    const { container } = render(<IncomeLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
  })

  it('renders 4 SkeletonIncomeTypeCard instances in the mobile transactions list', () => {
    const { container } = render(<IncomeLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
    const skeletons = mobileSection!.querySelectorAll('[data-slot="skeleton"]')
    // 4 SkeletonIncomeTypeCard * 5 skeletons each = 20
    expect(skeletons.length).toBe(20)
  })

  it('renders the desktop table skeleton (h-[400px])', () => {
    const { container } = render(<IncomeLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasTableSkeleton = Array.from(skeletons).some(el =>
      el.className.includes('h-[400px]')
    )
    expect(hasTableSkeleton).toBe(true)
  })

  it('renders desktop filter row skeletons (h-9 w-72 and h-9 w-48)', () => {
    const { container } = render(<IncomeLoading />)
    const searchSkeleton = container.querySelector('.h-9.w-72')
    const filterSkeleton = container.querySelector('.h-9.w-48')
    expect(searchSkeleton).not.toBeNull()
    expect(filterSkeleton).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<IncomeLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
