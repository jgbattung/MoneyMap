import { Reveal } from './Reveal'
import { GITHUB_URL } from './constants'

/**
 * Layout family: a two-by-two specification grid under the locked headline and sub.
 *
 * Part of this page's audience reads code for a living, so the credibility argument
 * under the headline is made with the actual engineering decisions rather than a logo
 * wall. Four items only, each a claim that can be checked in the repository.
 */
const STACK = [
  {
    title: 'Next.js 15 and React 19',
    body: 'App Router with server components, deployed on Vercel with functions placed in the same region as the database.',
  },
  {
    title: 'PostgreSQL through Prisma',
    body: 'Balance updates and the records that cause them are written in a single database transaction, so a half-applied transfer cannot happen.',
  },
  {
    title: 'TanStack Query v5',
    body: 'Writes are applied optimistically and rolled back on failure, so the figure on screen moves before the round trip finishes.',
  },
  {
    title: 'Tested on every change',
    body: 'Unit, component and end-to-end suites run against an isolated database on every pull request, alongside lint and a production build.',
  },
]

export function TechStrip() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Curious how it&apos;s built?
          </h2>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
            Built by one person, in the open. The code is on{' '}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              GitHub
            </a>
            .
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2">
          {STACK.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="border-t border-border/60 pt-6">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
