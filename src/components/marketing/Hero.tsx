import Image from 'next/image'
import Link from 'next/link'
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'
import { GITHUB_URL, SHOTS_DESKTOP, SHOTS_MOBILE, SHOT_WIDTH, SHOT_HEIGHT, SHOT_WIDTH_MOBILE, SHOT_HEIGHT_MOBILE } from './constants'

/**
 * Centred hero (Direction B): headline and CTAs stacked above a large dashboard capture,
 * with a phone capture overlapping its lower right corner, sized so it stays shorter
 * than the desktop shot behind it - the page's first hint that the product has two
 * real layouts.
 */
export function Hero() {
  return (
    <section className="border-b border-border/60 bg-background pt-14 pb-24 md:pt-20 md:pb-32">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <Reveal>
          <h1 className="mx-auto max-w-[18ch] text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            The whole picture of your money.
          </h1>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mx-auto mt-6 max-w-[48ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Every account, card and budget in one place, so you always know what&apos;s
            safe to spend.
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Start tracking
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

      <Reveal delay={0.24}>
        <div className="relative mx-auto mt-16 max-w-4xl px-4 md:px-10">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
            <Image
              src={SHOTS_DESKTOP.dashboard}
              alt="The MoneyMap dashboard, showing net worth, account balances and recent transactions"
              width={SHOT_WIDTH}
              height={SHOT_HEIGHT}
              priority
              sizes="(max-width: 768px) 100vw, 900px"
              className="h-auto w-full"
            />
          </div>

          {/* Overlaps the lower right corner, kept inside the section's own padding
              so nothing clips. Sized by a RATIO of the desktop image's rendered
              height, not a guessed pixel value (Amendment 4: this has now been wrong
              in both directions - too tall at w-[30%], too small at a flat lg:h-60).
              The desktop shot renders roughly 213px at 375px viewport, 429px at
              768px, and a flat ~509px from 1024px up (capped by this section's own
              max-w-4xl container). These height steps land the phone at 160/320/384px
              at those same breakpoints, which measures out to 70-80% of the desktop
              image's height at every one of them. Width is derived from that fixed
              height via the mobile capture's own aspect ratio. */}
          <div
            className="absolute -bottom-8 right-2 h-40 overflow-hidden rounded-[1.25rem] border-4 border-border bg-card shadow-xl sm:right-6 md:-bottom-12 md:right-8 md:h-80 lg:h-96"
            style={{ aspectRatio: `${SHOT_WIDTH_MOBILE} / ${SHOT_HEIGHT_MOBILE}` }}
          >
            <Image
              src={SHOTS_MOBILE.dashboard}
              alt="The same dashboard on the app's separate mobile layout"
              fill
              sizes="(max-width: 767px) 80px, (max-width: 1023px) 150px, 180px"
              className="object-cover"
            />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
