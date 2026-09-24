import { DeviceShot } from './DeviceShot'
import { Reveal } from './Reveal'
import { SHOTS_DESKTOP, SHOTS_MOBILE } from './constants'

/** Layout family: two-column split, copy left, shot right. */
export function FeatureNetWorth() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Watch it go up.
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              One number for everything you own and owe, tracked month after month
              against the goal you set.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <DeviceShot
            desktopSrc={SHOTS_DESKTOP['net-worth']}
            mobileSrc={SHOTS_MOBILE['net-worth']}
            desktopAlt="Net worth over the past year against a target, on desktop"
            mobileAlt="Net worth over the past year against a target, on mobile"
          />
        </Reveal>
      </div>
    </section>
  )
}
