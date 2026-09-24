import { PhoneShot } from './PhoneShot'
import { Reveal } from './Reveal'
import { SHOTS_MOBILE } from './constants'

/** Layout family: two-column split, copy left, shot right - same family as the net
 *  worth section, closing the zig-zag rhythm the budgets section opened. */
export function FeatureLedger() {
  return (
    <section className="border-b border-border/60 bg-card py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              How much did that vacation actually cost?
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              Tag anything, a trip, a move, a medical bill, and get one total, minus
              whatever came back.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <PhoneShot
            src={SHOTS_MOBILE['event-ledger']}
            alt="The event ledger filtered to the Japan Trip tag, showing combined expense and income totals, on mobile"
          />
        </Reveal>
      </div>
    </section>
  )
}
