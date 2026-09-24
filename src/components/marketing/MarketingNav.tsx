import Link from 'next/link'
import { IconBrandGithub } from '@tabler/icons-react'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { GITHUB_URL } from './constants'

/**
 * Direction A's capsule nav: a floating pill rather than a full-width bar. Carries only
 * three controls - Sign in, an icon-only GitHub link, and the Start tracking CTA -
 * "Features" and "Reports" links were cut as clutter with nowhere better to send a
 * visitor than the sections already below them.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-4 z-40 flex justify-center px-4">
      <nav
        aria-label="Primary"
        className="flex items-center gap-1 rounded-full border border-border/60 bg-card/90 py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur-md"
      >
        <Link href="/" className="flex items-center gap-2 pr-2" aria-label="MoneyMap home">
          <Icons.logo className="size-5 text-primary" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            MoneyMap
          </span>
        </Link>

        <div className="h-5 w-px bg-border/60" aria-hidden="true" />

        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>

        <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="GitHub">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
            <IconBrandGithub className="size-4" />
          </a>
        </Button>

        <Button asChild size="sm" className="rounded-full">
          <Link href="/sign-up">Start tracking</Link>
        </Button>
      </nav>
    </header>
  )
}
