import { Shot } from './Shot'
import { Reveal } from './Reveal'
import { SHOTS } from './constants'

/** Layout family: two-column split, copy left. Used once on the page. */
export function FeatureNetWorth() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              See your net worth move
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              Every account rolls up into one figure, with the change since last month
              and a target you can track progress against. Accounts you would rather
              leave out, like a retirement fund you cannot touch, simply do not count.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <Shot
            src={SHOTS.reports}
            alt="The reports page, showing net worth over time and a target progress bar"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Reveal>
      </div>
    </section>
  )
}
