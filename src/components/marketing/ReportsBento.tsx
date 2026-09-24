import Image from 'next/image'
import { Reveal } from './Reveal'
import { SHOTS_DESKTOP, SHOT_WIDTH, SHOT_HEIGHT } from './constants'

/**
 * Layout family: full-width stack, headline and sub centred above a single desktop
 * capture.
 *
 * Amendment 3 replaced the earlier three-image bento (which pulled in the mobile
 * transactions and accounts screenshots, neither of which this section's copy is
 * actually about) with one Category Breakdown capture, desktop only, its own heading
 * in frame and clear of the app's sticky page header.
 */
export function ReportsBento() {
  return (
    <section className="border-b border-border/60 bg-background py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <Reveal>
          <h2 className="max-w-[24ch] mx-auto text-3xl font-semibold tracking-tight md:text-4xl">
            Every number, every angle.
          </h2>
          <p className="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
            Break down any month or year by category, compare against last year, and
            filter every transaction you&apos;ve ever logged.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-12 max-w-5xl px-4 md:px-8">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <Image
              src={SHOTS_DESKTOP['category-breakdown']}
              alt="Category breakdown chart and per-category totals for the selected period"
              width={SHOT_WIDTH}
              height={SHOT_HEIGHT}
              sizes="(max-width: 768px) 100vw, 900px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
