import Image from 'next/image'
import { PhoneShot } from './PhoneShot'
import { Reveal } from './Reveal'
import { SHOTS_DESKTOP, SHOTS_MOBILE, SHOT_WIDTH, SHOT_HEIGHT } from './constants'

/**
 * Layout family: twin-image compare. Headline centred above two real captures of the
 * same page, side by side, statically, no toggle.
 *
 * Added in Amendment 3, between Reports and Tech, replacing the per-section
 * Desktop/Mobile toggle that used to make this same point on every feature section.
 * Shows Accounts rather than the dashboard the hero already uses, deliberately: one
 * page captured on both devices is what demonstrates the layouts genuinely differ,
 * which is this section's whole claim.
 */
export function FeatureDevices() {
  return (
    <section className="border-b border-border/60 bg-card py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Capture on your phone. Study it on your desktop.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
            Catch it in the moment on your phone. Make sense of it later on a bigger
            screen.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-8 px-4 md:flex-row md:items-end md:justify-center md:gap-10 md:px-8">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-card md:flex-1">
            <Image
              src={SHOTS_DESKTOP.accounts}
              alt="Every account's balance, laid out on desktop"
              width={SHOT_WIDTH}
              height={SHOT_HEIGHT}
              sizes="(max-width: 768px) 100vw, 60vw"
              className="h-auto w-full"
            />
          </div>

          <PhoneShot
            src={SHOTS_MOBILE.accounts}
            alt="Every account's balance, laid out on mobile"
            className="max-w-[220px] shrink-0"
          />
        </div>
      </Reveal>
    </section>
  )
}
