import Image from 'next/image'
import { Reveal } from './Reveal'
import {
  SHOTS_DESKTOP,
  SHOTS_MOBILE,
  SHOT_WIDTH,
  SHOT_HEIGHT,
  SHOT_WIDTH_MOBILE,
  SHOT_HEIGHT_MOBILE,
} from './constants'

/**
 * Layout family: bento grid, the one section on the page that isn't a two-image or
 * copy/shot pairing. One wide desktop tile (the breakdown charts and annual summary)
 * beside two tall mobile tiles (transactions, accounts), breaking the zig-zag rhythm the
 * five feature sections above it settle into, right before the closing CTA.
 */
export function ReportsBento() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Reveal>
          <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight md:text-4xl">
            Every number, every angle.
          </h2>
          <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
            Break down any month or year by category, compare against last year, and
            filter every transaction you&apos;ve ever logged.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal delay={0.06} className="md:col-span-2">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <Image
                src={SHOTS_DESKTOP.reports}
                alt="Category breakdown chart and the annual summary table"
                width={SHOT_WIDTH}
                height={SHOT_HEIGHT}
                sizes="(max-width: 768px) 100vw, 65vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 md:col-span-1 md:grid-cols-1">
            <Reveal delay={0.12}>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <Image
                  src={SHOTS_MOBILE.transactions}
                  alt="Every logged expense, income and transfer, filterable in one table"
                  width={SHOT_WIDTH_MOBILE}
                  height={SHOT_HEIGHT_MOBILE}
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="h-auto w-full"
                />
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <Image
                  src={SHOTS_MOBILE.accounts}
                  alt="Balances across every account, broken down by type"
                  width={SHOT_WIDTH_MOBILE}
                  height={SHOT_HEIGHT_MOBILE}
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="h-auto w-full"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
