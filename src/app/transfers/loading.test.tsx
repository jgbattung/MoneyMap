import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import TransfersLoading from './loading'

describe('TransfersLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<TransfersLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-28)', () => {
    const { container } = render(<TransfersLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-28')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the transfer types section heading skeleton (h-6 w-36)', () => {
    const { container } = render(<TransfersLoading />)
    const headingSkeleton = container.querySelector('.h-6.w-36')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the transfer types section description skeleton (h-4 w-80)', () => {
    const { container } = render(<TransfersLoading />)
    const descSkeleton = container.querySelector('.h-4.w-80')
    expect(descSkeleton).not.toBeNull()
  })

  it('renders 3 transfer type tile skeletons (h-16)', () => {
    const { container } = render(<TransfersLoading />)
    const tileskeletons = container.querySelectorAll('.h-16')
    expect(tileskeletons.length).toBe(3)
  })

  it('renders the transfer transactions section heading skeleton (h-6 w-48)', () => {
    const { container } = render(<TransfersLoading />)
    const headingSkeleton = container.querySelector('.h-6.w-48')
    expect(headingSkeleton).not.toBeNull()
  })

  it('renders the transfer transactions section description skeleton (h-4 w-72)', () => {
    const { container } = render(<TransfersLoading />)
    const descSkeleton = container.querySelector('.h-4.w-72')
    expect(descSkeleton).not.toBeNull()
  })

  it('renders the mobile transaction card list (md:hidden)', () => {
    const { container } = render(<TransfersLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
  })

  it('renders 4 SkeletonIncomeTypeCard instances in the mobile transactions list', () => {
    const { container } = render(<TransfersLoading />)
    const mobileSection = container.querySelector('.md\\:hidden')
    expect(mobileSection).not.toBeNull()
    const skeletons = mobileSection!.querySelectorAll('[data-slot="skeleton"]')
    // 4 SkeletonIncomeTypeCard * 5 skeletons each = 20
    expect(skeletons.length).toBe(20)
  })

  it('renders the desktop table skeleton (h-[400px])', () => {
    const { container } = render(<TransfersLoading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    const hasTableSkeleton = Array.from(skeletons).some(el =>
      el.className.includes('h-[400px]')
    )
    expect(hasTableSkeleton).toBe(true)
  })

  it('renders desktop filter row skeletons (h-9 w-72 and h-9 w-48)', () => {
    const { container } = render(<TransfersLoading />)
    const searchSkeleton = container.querySelector('.h-9.w-72')
    const filterSkeleton = container.querySelector('.h-9.w-48')
    expect(searchSkeleton).not.toBeNull()
    expect(filterSkeleton).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<TransfersLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
