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
import { FeatureLedger } from './FeatureLedger'
import { ReportsBento } from './ReportsBento'
import { FeatureDevices } from './FeatureDevices'
import { TechStrip } from './TechStrip'
import { ClosingCta } from './ClosingCta'
import { MarketingFooter } from './MarketingFooter'
import { GITHUB_URL } from './constants'

// ---------------------------------------------------------------------------

describe('MarketingNav', () => {
  it('is a capsule carrying GitHub, sign in, and the CTA', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe(
      '/sign-in',
    )
    expect(
      within(nav).getByRole('link', { name: /^start tracking$/i }).getAttribute('href'),
    ).toBe('/sign-up')
    const github = within(nav).getByRole('link', { name: /github/i })
    expect(github.getAttribute('href')).toBe(GITHUB_URL)
    // Amendment 4: GitHub gets a visible label, not an icon to decode.
    expect(github.textContent?.trim()).toBe('GitHub')
  })

  it('orders the desktop controls GitHub, Sign in, Start tracking left to right', () => {
    render(<MarketingNav />)
    const nav = screen.getByRole('navigation')
    const controls = within(nav)
      .getAllByRole('link')
      .filter((link) => link !== within(nav).getByRole('link', { name: /moneymap home/i }))
    expect(controls.map((link) => link.textContent?.trim())).toEqual([
      'GitHub',
      'Sign in',
      'Start tracking',
    ])
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
        '/screenshots/desktop/accounts-compact.png',
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

  it('sits on a teal field with an inverted CTA, a deliberate Rationed Accent exception', () => {
    const { container } = render(<ClosingCta />)
    const section = container.querySelector('section')
    expect(section?.className).toMatch(/\bbg-primary\b/)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.className).toMatch(/\btext-primary-foreground\b/)
    const cta = screen.getByRole('link', { name: /^start tracking$/i })
    expect(cta.className).toMatch(/\bbg-foreground\b/)
    expect(cta.className).toMatch(/\btext-primary\b/)
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

// ---------------------------------------------------------------------------
// Page composition (Amendment 4: ten sections, Cards retired)
// ---------------------------------------------------------------------------

import LandingPage from '@/app/(marketing)/page'
import { metadata } from '@/app/(marketing)/layout'
import { SHOTS_DESKTOP, SHOTS_MOBILE } from './constants'

describe('landing page composition', () => {
  it('renders the approved sections in the locked order', () => {
    // The section list is locked copy (Amendment 1, revised by 3 and 4). Every section
    // is unit-tested in isolation above, which leaves ORDER and PRESENCE untested: a
    // section could be dropped, duplicated or reordered without a single failure.
    render(<LandingPage />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual([
      'Watch it go up.',
      'Where did it all go?',
      'Stop a bad month before it happens.',
      'How much did that vacation actually cost?',
      'Every number, every angle.',
      'Capture on your phone. Study it on your desktop.',
      "Curious how it's built?",
      'Still guessing?',
    ])
  })

  it('does not reintroduce the Cards section retired in Amendment 4', () => {
    // Its captures deliberately stay on disk for the README gallery, so the only thing
    // stopping the section coming back is that nothing renders it.
    const { container } = render(<LandingPage />)
    const text = container.textContent ?? ''
    expect(text).not.toContain('Always know what you owe')
    expect(text).not.toContain("Every card's balance and due date")
    const srcs = screen.getAllByRole('img').map((i) => i.getAttribute('src'))
    expect(srcs).not.toContain(SHOTS_DESKTOP['card-detail'])
    expect(srcs).not.toContain(SHOTS_MOBILE['card-detail'])
  })

  it('has exactly one h1, and it is the hero headline', () => {
    render(<LandingPage />)
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe('The whole picture of your money.')
  })

  it('opens with the nav and closes with the footer', () => {
    render(<LandingPage />)
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeTruthy()
    expect(screen.getByRole('contentinfo')).toBeTruthy()
  })
})

describe('landing page accessibility', () => {
  it('gives every image a descriptive alt, never an empty or filename-shaped one', () => {
    // Only the hero's two images were checked before. The product screenshots carry
    // the page's entire evidence, so an unlabelled one is the whole argument lost for
    // a screen reader user.
    render(<LandingPage />)
    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThan(5)
    for (const img of images) {
      const alt = img.getAttribute('alt') ?? ''
      const src = img.getAttribute('src')
      expect(alt.length, `${src} has no alt text`).toBeGreaterThan(10)
      expect(alt, `${src} alt looks like a filename, not a description`).not.toMatch(
        /\.png$|^screenshot/i,
      )
    }
  })

  it('gives every link an accessible name', () => {
    render(<LandingPage />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(5)
    for (const link of links) {
      const name = link.getAttribute('aria-label') ?? link.textContent ?? ''
      expect(name.trim().length, `a link has no accessible name`).toBeGreaterThan(0)
    }
  })

  it('opens every external link safely', () => {
    render(<LandingPage />)
    const external = screen
      .getAllByRole('link')
      .filter((l) => (l.getAttribute('href') ?? '').startsWith('http'))
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })
})

describe('marketing route metadata', () => {
  it('sets the title and description that render in a shared link preview', () => {
    // This page exists to be linked from a resume, so its metadata is user-facing
    // output, not configuration. A default "Create Next App" title here would be the
    // first thing a reviewer saw.
    expect(metadata.title).toBe('MoneyMap - Stay on top of your money')
    expect(metadata.description).toBe(
      "Every account, card and budget in one place, so you always know what's safe to spend.",
    )
  })

  it('keeps the metadata free of the banned dash characters', () => {
    expect(`${metadata.title} ${metadata.description}`).not.toMatch(/[–—]/)
  })
})

// ---------------------------------------------------------------------------
// next/image `sizes` tripwire
// ---------------------------------------------------------------------------

describe('landing page image sizes', () => {
  /**
   * WHAT THIS IS, AND WHAT IT IS NOT.
   *
   * It is NOT a proof that each image's declared `sizes` is greater than or equal to
   * its rendered width. happy-dom has no layout engine: it does not resolve Tailwind
   * classes, compute box widths, or evaluate media queries, so the real invariant is
   * unverifiable in this environment. Verifying it properly needs a real browser
   * measuring `img.getBoundingClientRect().width` at each breakpoint, which is what
   * was done by hand in Phase 10 and is not automated anywhere.
   *
   * It IS a tripwire. A stale `sizes` degrades an image silently - Next serves a
   * variant sized for the old element and the browser upscales it - while breaking no
   * test at all. That exact bug shipped twice on this branch. These assertions pin the
   * size-driving class to the `sizes` value that was measured against it, so changing
   * one without the other fails loudly and names the reason.
   *
   * If one of these fails: you resized an image. Re-measure the element's actual
   * rendered width in a real browser at 375/768/1024/1440 and update BOTH the class
   * and the `sizes` string, then update the expectation here. Do not simply widen the
   * expectation to match.
   */
  const RESIZE_HINT =
    'This image was resized without updating its `sizes` (or vice versa). ' +
    'Next will serve a variant sized for the wrong element and the browser will ' +
    'upscale it, which looks degraded and breaks no other test. Re-measure the ' +
    'rendered width in a real browser and update both together.'

  const imageBySrc = (container: HTMLElement, src: string): HTMLImageElement => {
    const img = container.querySelector<HTMLImageElement>(`img[src="${src}"]`)
    expect(img, `no image rendered with src ${src}`).toBeTruthy()
    return img as HTMLImageElement
  }

  it('pins the hero phone height steps to the sizes measured against them', () => {
    const { container } = render(<Hero />)
    const img = imageBySrc(container, SHOTS_MOBILE.dashboard)
    const frame = img.closest('div[style]')
    expect(frame?.className, RESIZE_HINT).toMatch(/\bh-40\b/)
    expect(frame?.className, RESIZE_HINT).toMatch(/\bmd:h-80\b/)
    expect(frame?.className, RESIZE_HINT).toMatch(/\blg:h-96\b/)
    expect(img.getAttribute('sizes'), RESIZE_HINT).toBe(
      '(max-width: 767px) 80px, (max-width: 1023px) 150px, 180px',
    )
  })

  it('pins the hero desktop capture to its max-w-4xl container', () => {
    const { container } = render(<Hero />)
    const img = imageBySrc(container, SHOTS_DESKTOP.dashboard)
    expect(container.innerHTML, RESIZE_HINT).toContain('max-w-4xl')
    expect(img.getAttribute('sizes'), RESIZE_HINT).toBe('(max-width: 768px) 100vw, 900px')
  })

  it('pins the device section to its equal-height frame width', () => {
    const { container } = render(<FeatureDevices />)
    const img = imageBySrc(container, SHOTS_DESKTOP['accounts-compact'])
    expect(img.className, RESIZE_HINT).toMatch(/lg:h-\[420px\]/)
    expect(img.getAttribute('sizes'), RESIZE_HINT).toBe('(max-width: 1024px) 100vw, 672px')
  })

  it('pins the reports capture to its max-w-5xl container', () => {
    const { container } = render(<ReportsBento />)
    const img = imageBySrc(container, SHOTS_DESKTOP['category-breakdown'])
    expect(container.innerHTML, RESIZE_HINT).toContain('max-w-5xl')
    expect(img.getAttribute('sizes'), RESIZE_HINT).toBe('(max-width: 768px) 100vw, 960px')
  })

  it('pins the shared phone frame cap to its flat sizes value', () => {
    // PhoneShot backs five call sites. Its `max-w-[300px]` cap is what makes a single
    // flat `sizes` honest for all of them; widening the cap invalidates that.
    const { container } = render(<FeatureNetWorth />)
    const img = imageBySrc(container, SHOTS_MOBILE['net-worth'])
    expect(container.innerHTML, RESIZE_HINT).toContain('max-w-[300px]')
    expect(img.getAttribute('sizes'), RESIZE_HINT).toBe('300px')
  })

  it('declares a non-empty sizes on every image on the page', () => {
    // A `fill` or responsive image with no `sizes` makes Next fall back to 100vw and
    // download the largest variant on every viewport.
    render(<LandingPage />)
    for (const img of screen.getAllByRole('img')) {
      const sizes = img.getAttribute('sizes') ?? ''
      expect(sizes.trim().length, `${img.getAttribute('src')} declares no sizes`).toBeGreaterThan(
        0,
      )
    }
  })
})
