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
import { FeatureEverydayTracking } from './FeatureEverydayTracking'
import { FeatureBudgets } from './FeatureBudgets'
import { FeatureCards } from './FeatureCards'
import { FeatureLedger } from './FeatureLedger'
import { ReportsBento } from './ReportsBento'
import { FeatureDevices } from './FeatureDevices'
import { TechStrip } from './TechStrip'
import { ClosingCta } from './ClosingCta'
import { MarketingFooter } from './MarketingFooter'
import { GITHUB_URL } from './constants'

// ---------------------------------------------------------------------------

describe('MarketingNav', () => {
  it('is a capsule carrying only sign in, a GitHub icon button, and the CTA', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe(
      '/sign-in',
    )
    expect(
      within(nav).getByRole('link', { name: /^start tracking$/i }).getAttribute('href'),
    ).toBe('/sign-up')
    const github = within(nav).getByRole('link', { name: /^github$/i })
    expect(github.getAttribute('href')).toBe(GITHUB_URL)
    // Icon-only: no visible "GitHub" text node, only the accessible name.
    expect(github.textContent?.trim()).toBe('')
  })

  it('spans the content width with brand left and controls right, not a content-hugging pill', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    expect(nav.className).toMatch(/\bmax-w-6xl\b/)
    expect(nav.className).toMatch(/\bjustify-between\b/)
  })

  it('renders the MoneyMap wordmark, not an icon, with "Map" in the primary token', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    const brand = within(nav).getByRole('link', { name: /^moneymap home$/i })
    expect(brand.textContent).toBe('MoneyMap')
    expect(brand.querySelector('svg')).toBeNull()
    const mapSpan = within(brand).getByText('Map')
    expect(mapSpan.className).toMatch(/\btext-primary\b/)
  })
})

describe('Hero', () => {
  it('renders the locked headline as the page h1', () => {
    render(<Hero />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('The whole picture of your money.')
  })

  it('renders the locked subhead', () => {
    render(<Hero />)
    expect(
      screen.getByText(/every account, card and budget in one place/i),
    ).toBeTruthy()
  })

  it('points the primary CTA at /sign-up with the locked label', () => {
    render(<Hero />)
    const cta = screen.getByRole('link', { name: /^start tracking$/i })
    expect(cta.getAttribute('href')).toBe('/sign-up')
  })

  it('links the secondary CTA to GitHub, opened safely in a new tab', () => {
    render(<Hero />)
    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link.getAttribute('href')).toBe(GITHUB_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows both a desktop dashboard capture and an overlapping mobile capture', () => {
    render(<Hero />)
    const images = screen.getAllByRole('img')
    expect(images.map((i) => i.getAttribute('src'))).toEqual(
      expect.arrayContaining(['/screenshots/desktop/dashboard.png', '/screenshots/mobile/dashboard.png']),
    )
    for (const img of images) {
      expect((img.getAttribute('alt') ?? '').length).toBeGreaterThan(10)
    }
  })
})

describe('feature sections', () => {
  const cases = [
    {
      name: 'net worth',
      Component: FeatureNetWorth,
      heading: 'Watch it go up.',
      sub: /one number for everything you own and owe/i,
    },
    {
      name: 'everyday tracking',
      Component: FeatureEverydayTracking,
      heading: 'Where did it all go?',
      sub: /a month of spending laid out day by day/i,
    },
    {
      name: 'budgets',
      Component: FeatureBudgets,
      heading: 'Stop a bad month before it happens.',
      sub: /set a limit for each category/i,
    },
    {
      name: 'cards',
      Component: FeatureCards,
      heading: 'Always know what you owe.',
      sub: /every card's balance and due date/i,
    },
    {
      name: 'event ledger',
      Component: FeatureLedger,
      heading: 'How much did that vacation actually cost?',
      sub: /tag anything, a trip, a move, a medical bill, and get one total, minus whatever came back/i,
    },
  ]

  it.each(cases)('$name renders its locked headline and subhead verbatim', ({ Component, heading, sub }) => {
    render(<Component />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(heading)
    expect(screen.getByText(sub)).toBeTruthy()
  })

  it.each(cases)('$name renders a single mobile capture, no device toggle', ({ Component }) => {
    render(<Component />)
    expect(screen.queryByRole('button')).toBeNull()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('src')).toMatch(/^\/screenshots\/mobile\//)
  })
})

describe('ReportsBento', () => {
  it('renders the locked headline and subhead verbatim', () => {
    render(<ReportsBento />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Every number, every angle.')
    expect(
      screen.getByText(/break down any month or year by category/i),
    ).toBeTruthy()
  })

  it('renders exactly one desktop Category Breakdown capture', () => {
    render(<ReportsBento />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('src')).toBe('/screenshots/desktop/category-breakdown.png')
  })
})

describe('FeatureDevices', () => {
  it('renders the locked headline and subhead verbatim', () => {
    render(<FeatureDevices />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Capture on your phone. Study it on your desktop.',
    )
    expect(
      screen.getByText(/catch it in the moment on your phone/i),
    ).toBeTruthy()
  })

  it('shows the Accounts page on both devices, statically, as two real captures', () => {
    render(<FeatureDevices />)
    const images = screen.getAllByRole('img')
    expect(images.map((i) => i.getAttribute('src'))).toEqual(
      expect.arrayContaining([
        '/screenshots/desktop/accounts.png',
        '/screenshots/mobile/accounts.png',
      ]),
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('TechStrip', () => {
  it('renders the locked headline and subhead, linking to GitHub inside the sub', () => {
    render(<TechStrip />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe("Curious how it's built?")
    const link = screen.getByRole('link', { name: /^github$/i })
    expect(link.getAttribute('href')).toBe(GITHUB_URL)
    const sub = link.closest('p')
    expect(sub?.textContent).toBe('Built by one person, in the open. The code is on GitHub.')
  })

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

describe('ClosingCta', () => {
  it('renders only the locked headline and CTA, with no subhead', () => {
    render(<ClosingCta />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Still guessing?')
    expect(screen.queryByText(/./, { selector: 'p' })).toBeNull()
    const cta = screen.getByRole('link', { name: /^start tracking$/i })
    expect(cta.getAttribute('href')).toBe('/sign-up')
  })
})

describe('MarketingFooter', () => {
  it('groups links into a Project column (GitHub and License only) and an Account column', () => {
    render(<MarketingFooter />)
    const projectNav = screen.getByRole('navigation', { name: /project/i })
    const projectLinks = within(projectNav).getAllByRole('link')
    expect(projectLinks.map((l) => l.textContent)).toEqual(['GitHub', 'License'])
    expect(projectLinks[0].getAttribute('href')).toBe(GITHUB_URL)
    expect(projectLinks[1].getAttribute('href')).toBe(`${GITHUB_URL}/blob/main/LICENSE`)

    const accountNav = screen.getByRole('navigation', { name: /account/i })
    expect(
      within(accountNav).getByRole('link', { name: /^sign in$/i }).getAttribute('href'),
    ).toBe('/sign-in')
    expect(
      within(accountNav).getByRole('link', { name: /^start tracking$/i }).getAttribute('href'),
    ).toBe('/sign-up')
  })
})

describe('landing page copy discipline', () => {
  const sections = [
    Hero,
    FeatureNetWorth,
    FeatureEverydayTracking,
    FeatureBudgets,
    FeatureCards,
    FeatureLedger,
    ReportsBento,
    FeatureDevices,
    TechStrip,
    ClosingCta,
    MarketingNav,
    MarketingFooter,
  ]

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

  it('never claims figures are correct, accurate or automatic - table stakes, not a pitch', () => {
    for (const Component of sections) {
      const { container, unmount } = render(<Component />)
      const text = (container.textContent ?? '').toLowerCase()
      for (const banned of ['correct', 'accurate', 'automatic', 'statement cycle']) {
        expect(text, `${Component.name} contains the banned claim "${banned}"`).not.toContain(
          banned,
        )
      }
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
