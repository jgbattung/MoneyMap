import { Shot } from './Shot'
import { Reveal } from './Reveal'
import { SHOTS } from './constants'

/**
 * Layout family: headline over an offset image pair. Deliberately not another
 * text-beside-image split, because the section directly above is one and two in a row
 * is the cap.
 */
export function FeatureAccounts() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <div className="max-w-[46ch]">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Cards that follow their real cycles
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Each card keeps its own statement date, due date and statement balance.
              Group the cards that share a billing cycle and read them together.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-7" delay={0.06}>
            <Shot
              src={SHOTS.cards}
              alt="The cards page, showing credit cards with statement balances and due dates"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </Reveal>
          {/* Offset downward so the pair reads as a composition rather than two equal
              tiles in a row. */}
          <Reveal className="md:col-span-5 md:mt-16" delay={0.14}>
            <Shot
              src={SHOTS.accounts}
              alt="The accounts page, listing balances across checking, savings, cash and investment accounts"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
