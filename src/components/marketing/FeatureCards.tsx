import { PhoneShot } from './PhoneShot'
import { Reveal } from './Reveal'
import { SHOTS_MOBILE } from './constants'

/** Layout family: full-width stack, left-aligned copy above a centred shot - varies
 *  the centred text of the tracking section above it. */
export function FeatureCards() {
  return (
    <section className="border-b border-border/60 bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Reveal>
          <div className="max-w-[46ch]">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Always know what you owe.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Every card&apos;s balance and due date in one place, so paying them off
              is never guesswork.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <PhoneShot
            src={SHOTS_MOBILE['card-detail']}
            alt="A single credit card's statement balance, statement date and transactions, on mobile"
          />
        </Reveal>
      </div>
    </section>
  )
}
