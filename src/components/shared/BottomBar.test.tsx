import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import BottomBar from './BottomBar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}))

// Mock mobileNavRoutes with simple span icons
vi.mock('@/app/constants/navigation', () => ({
  mobileNavRoutes: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="icon-dashboard" {...props} />,
      activeIcon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="active-icon-dashboard" {...props} />,
    },
    {
      name: 'Accounts',
      path: '/accounts',
      icon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="icon-accounts" {...props} />,
      activeIcon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="active-icon-accounts" {...props} />,
    },
    {
      name: 'Transactions',
      path: '/transactions',
      icon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="icon-transactions" {...props} />,
      activeIcon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="active-icon-transactions" {...props} />,
    },
    {
      name: 'More',
      path: '/more',
      icon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="icon-more" {...props} />,
      activeIcon: (props: React.SVGProps<SVGSVGElement>) => <span data-testid="active-icon-more" {...props} />,
    },
  ],
}))

// Mock FloatingActionButton
vi.mock('./FloatingActionButton', () => ({
  default: () => <div data-testid="fab" />,
}))

import { usePathname } from 'next/navigation'

// Helper: get link by href
function getLinkByHref(href: string): HTMLElement {
  const el = document.querySelector(`a[href="${href}"]`)
  if (!el) throw new Error(`No link found with href "${href}"`)
  return el as HTMLElement
}

describe('BottomBar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('structural rendering', () => {
    it('renders 4 nav links', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(4)
    })

    it('renders links with the correct hrefs', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      expect(document.querySelector('a[href="/dashboard"]')).not.toBeNull()
      expect(document.querySelector('a[href="/accounts"]')).not.toBeNull()
      expect(document.querySelector('a[href="/transactions"]')).not.toBeNull()
      expect(document.querySelector('a[href="/more"]')).not.toBeNull()
    })

    it('renders the FloatingActionButton', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      expect(screen.getByTestId('fab')).toBeDefined()
    })
  })

  describe('active icon pattern — /dashboard active', () => {
    it('shows activeIcon for /dashboard and outline icons for all others', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      expect(screen.getByTestId('active-icon-dashboard')).toBeDefined()
      expect(screen.queryByTestId('icon-dashboard')).toBeNull()

      expect(screen.getByTestId('icon-accounts')).toBeDefined()
      expect(screen.queryByTestId('active-icon-accounts')).toBeNull()

      expect(screen.getByTestId('icon-transactions')).toBeDefined()
      expect(screen.queryByTestId('active-icon-transactions')).toBeNull()

      expect(screen.getByTestId('icon-more')).toBeDefined()
      expect(screen.queryByTestId('active-icon-more')).toBeNull()
    })
  })

  describe('active icon pattern — /accounts active', () => {
    it('shows activeIcon for /accounts and outline icons for all others', () => {
      vi.mocked(usePathname).mockReturnValue('/accounts')
      render(<BottomBar />)

      expect(screen.getByTestId('active-icon-accounts')).toBeDefined()
      expect(screen.queryByTestId('icon-accounts')).toBeNull()

      expect(screen.getByTestId('icon-dashboard')).toBeDefined()
      expect(screen.queryByTestId('active-icon-dashboard')).toBeNull()

      expect(screen.getByTestId('icon-transactions')).toBeDefined()
      expect(screen.getByTestId('icon-more')).toBeDefined()
    })
  })

  describe('active icon pattern — /transactions active', () => {
    it('shows activeIcon for /transactions and outline icons for all others', () => {
      vi.mocked(usePathname).mockReturnValue('/transactions')
      render(<BottomBar />)

      expect(screen.getByTestId('active-icon-transactions')).toBeDefined()
      expect(screen.queryByTestId('icon-transactions')).toBeNull()

      expect(screen.getByTestId('icon-dashboard')).toBeDefined()
      expect(screen.getByTestId('icon-accounts')).toBeDefined()
      expect(screen.getByTestId('icon-more')).toBeDefined()
    })
  })

  describe('active icon pattern — /more active', () => {
    it('shows activeIcon for /more and outline icons for all others', () => {
      vi.mocked(usePathname).mockReturnValue('/more')
      render(<BottomBar />)

      expect(screen.getByTestId('active-icon-more')).toBeDefined()
      expect(screen.queryByTestId('icon-more')).toBeNull()

      expect(screen.getByTestId('icon-dashboard')).toBeDefined()
      expect(screen.getByTestId('icon-accounts')).toBeDefined()
      expect(screen.getByTestId('icon-transactions')).toBeDefined()
    })
  })

  describe('active icon pattern — no matching route', () => {
    it('shows all outline icons when pathname does not match any route', () => {
      vi.mocked(usePathname).mockReturnValue('/some-other-page')
      render(<BottomBar />)

      expect(screen.getByTestId('icon-dashboard')).toBeDefined()
      expect(screen.getByTestId('icon-accounts')).toBeDefined()
      expect(screen.getByTestId('icon-transactions')).toBeDefined()
      expect(screen.getByTestId('icon-more')).toBeDefined()

      expect(screen.queryByTestId('active-icon-dashboard')).toBeNull()
      expect(screen.queryByTestId('active-icon-accounts')).toBeNull()
      expect(screen.queryByTestId('active-icon-transactions')).toBeNull()
      expect(screen.queryByTestId('active-icon-more')).toBeNull()
    })
  })

  describe('active CSS class', () => {
    it('applies text-white to the active link and text-muted-foreground to inactive links — /dashboard active', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      expect(getLinkByHref('/dashboard').className).toContain('text-white')
      expect(getLinkByHref('/accounts').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/transactions').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/more').className).toContain('text-muted-foreground')
    })

    it('applies text-white to the active link and text-muted-foreground to inactive links — /accounts active', () => {
      vi.mocked(usePathname).mockReturnValue('/accounts')
      render(<BottomBar />)

      expect(getLinkByHref('/accounts').className).toContain('text-white')
      expect(getLinkByHref('/dashboard').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/transactions').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/more').className).toContain('text-muted-foreground')
    })

    it('applies text-white to the active link and text-muted-foreground to inactive links — /transactions active', () => {
      vi.mocked(usePathname).mockReturnValue('/transactions')
      render(<BottomBar />)

      expect(getLinkByHref('/transactions').className).toContain('text-white')
      expect(getLinkByHref('/dashboard').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/accounts').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/more').className).toContain('text-muted-foreground')
    })

    it('applies text-white to the active link and text-muted-foreground to inactive links — /more active', () => {
      vi.mocked(usePathname).mockReturnValue('/more')
      render(<BottomBar />)

      expect(getLinkByHref('/more').className).toContain('text-white')
      expect(getLinkByHref('/dashboard').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/accounts').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/transactions').className).toContain('text-muted-foreground')
    })

    it('applies text-muted-foreground to all links when no route is active', () => {
      vi.mocked(usePathname).mockReturnValue('/some-other-page')
      render(<BottomBar />)

      expect(getLinkByHref('/dashboard').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/accounts').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/transactions').className).toContain('text-muted-foreground')
      expect(getLinkByHref('/more').className).toContain('text-muted-foreground')
    })
  })

  describe('layout — 2 links before FAB, 2 after', () => {
    it('Dashboard and Accounts appear before the FAB in the DOM', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      const fab = screen.getByTestId('fab')
      const allLinks = screen.getAllByRole('link')
      const allElements = Array.from(document.body.querySelectorAll('a, [data-testid="fab"]'))

      const fabIndex = allElements.indexOf(fab)
      const dashboardIndex = allElements.indexOf(allLinks[0])
      const accountsIndex = allElements.indexOf(allLinks[1])
      const transactionsIndex = allElements.indexOf(allLinks[2])
      const moreIndex = allElements.indexOf(allLinks[3])

      expect(dashboardIndex).toBeLessThan(fabIndex)
      expect(accountsIndex).toBeLessThan(fabIndex)
      expect(transactionsIndex).toBeGreaterThan(fabIndex)
      expect(moreIndex).toBeGreaterThan(fabIndex)
    })
  })

  describe('icon size prop', () => {
    it('passes size=24 to each icon component', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard')
      render(<BottomBar />)

      // active-icon-dashboard is active, accounts/transactions/more are outline icons
      expect(screen.getByTestId('active-icon-dashboard').getAttribute('size')).toBe('24')
      expect(screen.getByTestId('icon-accounts').getAttribute('size')).toBe('24')
      expect(screen.getByTestId('icon-transactions').getAttribute('size')).toBe('24')
      expect(screen.getByTestId('icon-more').getAttribute('size')).toBe('24')
    })
  })
})
