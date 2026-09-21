import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { GITHUB_URL } from './constants'

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="MoneyMap home">
          <Icons.logo className="size-6 text-primary" />
          <span className="text-base font-semibold tracking-tight">MoneyMap</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Dropped below `sm`: at 375px all four items do not fit on one line and the
              primary CTA gets clipped. GitHub is the most expendable of the three and
              is still in the footer. */}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
