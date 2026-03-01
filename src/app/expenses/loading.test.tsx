import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ExpensesLoading from './loading'

describe('ExpensesLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<ExpensesLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-32)', () => {
    const { container } = render(<ExpensesLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-32')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the action button skeleton (h-9 w-32)', () => {
    const { container } = render(<ExpensesLoading />)
    const buttonSkeleton = container.querySelector('.h-9.w-32')
    expect(buttonSkeleton).not.toBeNull()
  })

  it('renders the header row with space-between layout', () => {
    const { container } = render(<ExpensesLoading />)
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).not.toBeNull()
  })

  it('renders the mobile card list section (md:hidden)', () => {
    const { container } = render(<ExpensesLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
  })

  it('renders 5 SkeletonIncomeTypeCard instances in the mobile section', () => {
    const { container } = render(<ExpensesLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
    // Each SkeletonIncomeTypeCard has 5 Skeleton children
    const skeletons = mobileSection!.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(25)
  })

  it('renders the desktop table skeleton section (hidden md:flex)', () => {
    const { container } = render(<ExpensesLoading />)
    const desktopSection = container.querySelector('.hidden.md\\:flex')
    expect(desktopSection).not.toBeNull()
  })

  it('renders the large table skeleton (h-[400px])', () => {
    const { container } = render(<ExpensesLoading />)
    // Tailwind arbitrary values won't appear as a CSS class shortcut; check the full class string
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasTableSkeleton = Array.from(skeletons).some(el =>
      el.className.includes('h-[400px]')
    )
    expect(hasTableSkeleton).toBe(true)
  })

  it('renders desktop filter skeletons (h-9 w-72 and h-9 w-48)', () => {
    const { container } = render(<ExpensesLoading />)
    const searchSkeleton = container.querySelector('.h-9.w-72')
    const filterSkeleton = container.querySelector('.h-9.w-48')
    expect(searchSkeleton).not.toBeNull()
    expect(filterSkeleton).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<ExpensesLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
