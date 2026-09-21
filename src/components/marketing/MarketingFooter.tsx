import Link from 'next/link'
import { Icons } from '@/components/icons'
import { GITHUB_URL } from './constants'

export function MarketingFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center md:px-8">
        <div className="flex items-center gap-2">
          <Icons.logo className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">MoneyMap</span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link href="/sign-in" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up" className="transition-colors hover:text-foreground">
            Create account
          </Link>
        </nav>
      </div>
    </footer>
  )
}
