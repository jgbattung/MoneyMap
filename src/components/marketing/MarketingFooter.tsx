import Link from 'next/link'
import { GITHUB_URL } from './constants'

const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`

export function MarketingFooter() {
  return (
    <footer className="bg-background py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="col-span-2 flex items-center sm:col-span-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Money<span className="text-primary">Map</span>
            </span>
          </div>

          <nav aria-label="Project">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={LICENSE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  License
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/sign-in"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Start tracking
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MoneyMap
        </p>
      </div>
    </footer>
  )
}
