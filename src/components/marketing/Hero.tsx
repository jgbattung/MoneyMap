import Link from 'next/link'
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Shot } from './Shot'
import { Reveal } from './Reveal'
import { GITHUB_URL, SHOTS } from './constants'

/**
 * Asymmetric split hero: copy holds the left five columns, the product runs off the
 * right edge. Centred-over-a-gradient was rejected deliberately; this app's whole
 * argument is that the numbers are the point, so the screenshot carries the hero and
 * the copy gets out of its way.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Reveal>
            <h1 className="max-w-[16ch] text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Know where your money stands.
            </h1>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              MoneyMap tracks your accounts, cards, budgets and net worth, and keeps
              every figure correct as you spend.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Create account
                  <IconArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
                  <IconBrandGithub className="size-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Runs past the right edge on large screens, so the product reads as something
            that continues rather than a framed picture sitting in a box. The marketing
            layout clips the overflow. */}
        <div className="lg:col-span-7 lg:-mr-24 xl:-mr-40">
          <Reveal delay={0.12}>
            <Shot
              src={SHOTS.dashboard}
              alt="The MoneyMap dashboard, showing net worth, account balances and recent transactions"
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
