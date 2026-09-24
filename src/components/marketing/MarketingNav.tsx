import Link from 'next/link'
import { IconBrandGithub } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { GITHUB_URL } from './constants'

/**
 * Direction A's capsule nav, spanning the page's content width rather than hugging its
 * own controls (Amendment 3: the earlier build rendered a ~356px pill on a large
 * monitor, reading as cramped against the `max-w-6xl` sections below it). Brand on the
 * left, controls on the right - Sign in, an icon-only GitHub link, and the Start
 * tracking CTA. "Features" and "Reports" links were cut as clutter with nowhere better
 * to send a visitor than the sections already below them.
 *
 * The brand mark is a wordmark, not an icon: there is no MoneyMap logo asset in
 * `public/`, and the icon this section used to render there was never a real brand
 * mark.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-4 z-40 px-4 md:px-8">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-border/60 bg-card/90 py-1.5 pl-5 pr-1.5 shadow-lg backdrop-blur-md"
      >
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
          aria-label="MoneyMap home"
        >
          Money<span className="text-primary">Map</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/sign-in">Sign in</Link>
          </Button>

          {/* Hidden below sm to keep the capsule on one line at 375px - the same fix
              already needed once before this section carried a text "GitHub" link.
              GitHub stays reachable via the footer at every width. */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
            aria-label="GitHub"
          >
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              <IconBrandGithub className="size-4" />
            </a>
          </Button>

          <Button asChild size="sm" className="rounded-full">
            <Link href="/sign-up">Start tracking</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
