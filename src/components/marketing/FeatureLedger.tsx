import { Shot } from './Shot'
import { Reveal } from './Reveal'
import { SHOTS } from './constants'

/** Layout family: full-width stack, narrow copy column over a wide image. */
export function FeatureLedger() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <div className="max-w-[54ch]">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Tag a trip, then read what it cost
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Tags span expenses and income, so a holiday, a move or a hospital week
              becomes one ledger with both sides of the story on it. Filter, search and
              analyse the full history whenever a number looks wrong.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <Shot
            src={SHOTS.transactions}
            alt="The transactions page, showing a filterable table of expenses, income and transfers"
            className="mt-12"
            sizes="(max-width: 768px) 100vw, 90vw"
          />
        </Reveal>
      </div>
    </section>
  )
}
