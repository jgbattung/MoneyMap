import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CardsLoading from './loading'

describe('CardsLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<CardsLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-24)', () => {
    const { container } = render(<CardsLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-24')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the add-card button skeleton (h-9 w-36)', () => {
    const { container } = render(<CardsLoading />)
    const buttonSkeleton = container.querySelector('.h-9.w-36')
    expect(buttonSkeleton).not.toBeNull()
  })

  it('renders 3 SkeletonCardCard instances', () => {
    const { container } = render(<CardsLoading />)
    // Each SkeletonCardCard has 5 Skeleton children
    // Total: title(1) + button(1) + 3 cards * 5 skeletons each = 17
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(17)
  })

  it('renders the card grid with correct class structure', () => {
    const { container } = render(<CardsLoading />)
    const grid = container.querySelector('.grid.grid-cols-1')
    expect(grid).not.toBeNull()
    expect(grid!.className).toContain('gap-4')
    expect(grid!.className).toContain('mt-10')
  })

  it('renders a header row with space-between layout', () => {
    const { container } = render(<CardsLoading />)
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<CardsLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
