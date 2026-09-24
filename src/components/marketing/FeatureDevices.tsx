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
    <section className="border-b border-border/60 bg-background py-20 md:py-28">
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

      {/* Amendment 4: the desktop image used to be width-driven (md:flex-1, h-auto)
          against a width-driven phone, which rendered the phone 1.65x the desktop
          image's height - the desktop capture read as an afterthought in the one
          section whose whole claim is that both devices matter. Both images now
          render at the same fixed height from lg up (1024px), each width derived
          from its own aspect ratio: 420px tall puts the desktop shot at ~672px wide
          and the phone at ~194px, totalling ~906px, which fits inside max-w-5xl.
          Below lg they stay width-driven and stack. */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-8 px-4 md:px-8 lg:flex-row lg:items-end lg:justify-center lg:gap-10">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-card lg:w-auto lg:max-w-none lg:shrink-0">
            <Image
              src={SHOTS_DESKTOP.accounts}
              alt="Every account's balance, laid out on desktop"
              width={SHOT_WIDTH}
              height={SHOT_HEIGHT}
              sizes="(max-width: 1024px) 100vw, 672px"
              className="h-auto w-full object-cover lg:h-[420px] lg:w-auto"
            />
          </div>

          <PhoneShot
            src={SHOTS_MOBILE.accounts}
            alt="Every account's balance, laid out on mobile"
            className="max-w-[220px] shrink-0 lg:h-[420px] lg:w-auto lg:max-w-none"
          />
        </div>
      </Reveal>
    </section>
  )
}
