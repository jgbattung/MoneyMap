import { PhoneShot } from './PhoneShot'
import { Reveal } from './Reveal'
import { SHOTS_MOBILE } from './constants'

/** Layout family: two-column split, mirrored from the net worth section - shot left,
 *  copy right. */
export function FeatureBudgets() {
  return (
    <section className="border-b border-border/60 bg-card py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <PhoneShot
            src={SHOTS_MOBILE.budgets}
            alt="Monthly budgets per category with one category over its limit, on mobile"
          />
        </Reveal>

        <Reveal delay={0.08} className="order-1 lg:order-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Stop a bad month before it happens.
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              Set a limit for each category and see how much room you have left, any
              day of the month.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
