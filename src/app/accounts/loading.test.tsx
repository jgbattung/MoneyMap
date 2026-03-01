import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AccountsLoading from './loading'

describe('AccountsLoading', () => {
  it('renders without throwing', () => {
    expect(() => render(<AccountsLoading />)).not.toThrow()
  })

  it('renders the page title skeleton (h-10 w-36)', () => {
    const { container } = render(<AccountsLoading />)
    const titleSkeleton = container.querySelector('.h-10.w-36')
    expect(titleSkeleton).not.toBeNull()
  })

  it('renders the add-account button skeleton (h-9 w-32)', () => {
    const { container } = render(<AccountsLoading />)
    const buttonSkeleton = container.querySelector('.h-9.w-32')
    expect(buttonSkeleton).not.toBeNull()
  })

  it('renders 4 SkeletonAccountCard instances', () => {
    const { container } = render(<AccountsLoading />)
    // Each SkeletonAccountCard renders a div with 4 Skeleton children
    // Total skeleton elements: title(1) + button(1) + 4 cards * 4 skeletons each = 18
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(18)
  })

  it('renders the card grid with correct responsive classes', () => {
    const { container } = render(<AccountsLoading />)
    const grid = container.querySelector('.grid.grid-cols-1')
    expect(grid).not.toBeNull()
    expect(grid!.className).toContain('gap-4')
    expect(grid!.className).toContain('mt-10')
  })

  it('renders a header row with space-between layout', () => {
    const { container } = render(<AccountsLoading />)
    const header = container.querySelector('.flex.items-center.justify-between')
    expect(header).not.toBeNull()
  })

  it('has the correct outer wrapper class structure', () => {
    const { container } = render(<AccountsLoading />)
    const wrapper = container.firstElementChild
    expect(wrapper).not.toBeNull()
    expect(wrapper!.className).toContain('max-w-7xl')
    expect(wrapper!.className).toContain('mx-auto')
    expect(wrapper!.className).toContain('flex-col')
  })
})
