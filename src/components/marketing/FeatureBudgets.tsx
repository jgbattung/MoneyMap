import { Shot } from './Shot'
import { Reveal } from './Reveal'
import { SHOTS } from './constants'

/**
 * Layout family: bento. Exactly three cells for three pieces of content, two of them
 * real product imagery so the grid is not a wall of text cards.
 */
export function FeatureBudgets() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">
            Budgets that move as you spend
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Reveal className="md:col-span-2" delay={0.06}>
            <Shot
              src={SHOTS.budgets}
              alt="The budgets page, showing monthly limits per category with one category over budget"
              sizes="(max-width: 768px) 100vw, 65vw"
            />
          </Reveal>

          <Reveal className="md:col-span-1" delay={0.12}>
            <div className="flex h-full flex-col justify-center rounded-xl border border-border/60 bg-card p-6 md:p-8">
              <p className="text-base leading-relaxed text-muted-foreground">
                Set a monthly limit per category. The bar moves the moment you record an
                expense, so a category going over shows up in the second week rather
                than on the last day of the month.
              </p>
            </div>
          </Reveal>

          <Reveal className="md:col-span-3" delay={0.06}>
            <Shot
              src={SHOTS.calendar}
              alt="The activity calendar, showing spending and income per day across a month"
              sizes="(max-width: 768px) 100vw, 90vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
