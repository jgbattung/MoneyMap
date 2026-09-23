import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * framer-motion's `motion.div` is replaced by a plain div that still RENDERS ITS
 * CHILDREN and forwards className. A mock that returned an empty div would make every
 * assertion below pass against nothing, which is exactly the inert-mock trap this repo
 * has been bitten by before.
 */
vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: new Proxy(
    {},
    {
      get: () =>
        function MockMotion({
          children,
          className,
        }: {
          children?: React.ReactNode
          className?: string
          [key: string]: unknown
        }) {
          return <div className={className}>{children}</div>
        },
    },
  ),
}))

// next/image renders a plain img so `src` and `alt` stay assertable. `priority` and
// `fill` are Next-only props and are dropped rather than forwarded to the DOM.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    priority: _priority,
    fill: _fill,
    ...rest
  }: {
    src: string
    alt: string
    priority?: boolean
    fill?: boolean
    [key: string]: unknown
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...(rest as Record<string, unknown>)} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { MarketingNav } from './MarketingNav'
import { Hero } from './Hero'
import { FeatureNetWorth } from './FeatureNetWorth'
import { FeatureAccounts } from './FeatureAccounts'
import { FeatureBudgets } from './FeatureBudgets'
import { FeatureLedger } from './FeatureLedger'
import { TechStrip } from './TechStrip'
import { ClosingCta } from './ClosingCta'
import { MarketingFooter } from './MarketingFooter'
import { GITHUB_URL } from './constants'

// ---------------------------------------------------------------------------

describe('Hero', () => {
  it('renders the headline as the page h1', () => {
    render(<Hero />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('Know where your money stands')
  })

  it('renders the benefit-led subhead', () => {
    render(<Hero />)
    expect(screen.getByText(/keeps every figure correct as you spend/i)).toBeTruthy()
  })

  it('points its primary call to action at /sign-up', () => {
    render(<Hero />)
    const cta = screen.getByRole('link', { name: /create account/i })
    expect(cta.getAttribute('href')).toBe('/sign-up')
  })

  it('links to the GitHub repository, opened safely in a new tab', () => {
    render(<Hero />)
    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link.getAttribute('href')).toBe(GITHUB_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('uses the dashboard screenshot as the hero image, with real alt text', () => {
    render(<Hero />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('/screenshots/desktop/dashboard.png')
    expect((img.getAttribute('alt') ?? '').length).toBeGreaterThan(10)
  })
})

describe('feature sections', () => {
  const cases = [
    {
      name: 'net worth',
      Component: FeatureNetWorth,
      heading: /see your net worth move/i,
      images: ['/screenshots/desktop/net-worth.png'],
    },
    {
      name: 'accounts and cards',
      Component: FeatureAccounts,
      heading: /cards that follow their real cycles/i,
      images: ['/screenshots/desktop/card-detail.png', '/screenshots/desktop/accounts.png'],
    },
    {
      name: 'budgets',
      Component: FeatureBudgets,
      heading: /budgets that move as you spend/i,
      images: ['/screenshots/desktop/budgets.png', '/screenshots/desktop/calendar.png'],
    },
    {
      name: 'event ledger',
      Component: FeatureLedger,
      heading: /tag a trip, then read what it cost/i,
      images: ['/screenshots/desktop/transactions.png'],
    },
  ]

  it.each(cases)('$name renders its heading', ({ Component, heading }) => {
    render(<Component />)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeTruthy()
  })

  it.each(cases)('$name renders its screenshots with alt text', ({ Component, images }) => {
    render(<Component />)
    const rendered = screen.getAllByRole('img')
    expect(rendered.map((i) => i.getAttribute('src')).sort()).toEqual([...images].sort())
    for (const img of rendered) {
      expect((img.getAttribute('alt') ?? '').length).toBeGreaterThan(10)
    }
  })
})

describe('tech strip', () => {
  it('renders every stack claim', () => {
    render(<TechStrip />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(4)
    expect(headings.map((h) => h.textContent)).toEqual([
      'Next.js 15 and React 19',
      'PostgreSQL through Prisma',
      'TanStack Query v5',
      'Tested on every change',
    ])
  })
})

describe('navigation and footer', () => {
  it('nav offers sign in and account creation', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe(
      '/sign-in',
    )
    expect(
      within(nav).getByRole('link', { name: /^create account$/i }).getAttribute('href'),
    ).toBe('/sign-up')
    expect(within(nav).getByRole('link', { name: /^github$/i }).getAttribute('href')).toBe(
      GITHUB_URL,
    )
  })

  it('footer links to GitHub and both auth routes', () => {
    render(<MarketingFooter />)
    expect(screen.getByRole('link', { name: /github/i }).getAttribute('href')).toBe(GITHUB_URL)
    expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe('/sign-in')
    expect(screen.getByRole('link', { name: /create account/i }).getAttribute('href')).toBe(
      '/sign-up',
    )
  })

  it('closing call to action repeats the same signup label and destination', () => {
    render(<ClosingCta />)
    const cta = screen.getByRole('link', { name: /create account/i })
    expect(cta.getAttribute('href')).toBe('/sign-up')
  })
})

describe('landing page copy discipline', () => {
  const sections = [Hero, FeatureNetWorth, FeatureAccounts, FeatureBudgets, FeatureLedger, TechStrip, ClosingCta, MarketingNav, MarketingFooter]

  it('contains no em dash or en dash anywhere in visible copy', () => {
    for (const Component of sections) {
      const { container, unmount } = render(<Component />)
      const text = container.textContent ?? ''
      expect(text, `${Component.name} contains a dash character that is banned`).not.toMatch(
        /[–—]/,
      )
      unmount()
    }
  })

  it('does not use the private-instrument framing reserved for the README', () => {
    for (const Component of sections) {
      const { container, unmount } = render(<Component />)
      expect((container.textContent ?? '').toLowerCase()).not.toContain('personal instrument')
      unmount()
    }
  })
})
