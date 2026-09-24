import { DeviceShot } from './DeviceShot'
import { Reveal } from './Reveal'
import { SHOTS_DESKTOP, SHOTS_MOBILE } from './constants'

/** Layout family: full-width stack, copy centred above a centred shot. */
export function FeatureEverydayTracking() {
  return (
    <section className="border-b border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Where did it all go?
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
            A month of spending laid out day by day, including the small stuff
            you&apos;d already forgotten.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <DeviceShot
            desktopSrc={SHOTS_DESKTOP.calendar}
            mobileSrc={SHOTS_MOBILE.calendar}
            desktopAlt="The activity calendar with a day selected and its transactions listed, on desktop"
            mobileAlt="The activity calendar with a day selected and its transactions listed, on mobile"
          />
        </Reveal>
      </div>
    </section>
  )
}
