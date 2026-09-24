'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IconDeviceDesktop, IconDeviceMobile } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { SHOT_WIDTH, SHOT_HEIGHT, SHOT_WIDTH_MOBILE, SHOT_HEIGHT_MOBILE } from './constants'

type Device = 'mobile' | 'desktop'

const OPTIONS: { id: Device; label: string; Icon: typeof IconDeviceMobile }[] = [
  { id: 'mobile', label: 'Mobile', Icon: IconDeviceMobile },
  { id: 'desktop', label: 'Desktop', Icon: IconDeviceDesktop },
]

/**
 * A product screenshot with a Desktop/Mobile toggle, defaulting to Mobile.
 *
 * This is the page's only proof that the app has a genuinely separate mobile layout
 * rather than a responsive squeeze: both states are real Playwright captures at their
 * own device profile (`scripts/demo/screenshots.ts`), never a CSS-scaled desktop shot
 * standing in for a mobile one.
 *
 * The outer frame's height is fixed to the mobile capture's aspect ratio regardless of
 * which state is showing, so switching device never shifts the page - the desktop
 * capture (much wider, much shorter) letterboxes inside that same box instead of
 * resizing it. No animation runs on switch, so there is nothing for
 * `prefers-reduced-motion` to need to suppress.
 */
export function DeviceShot({
  desktopSrc,
  mobileSrc,
  desktopAlt,
  mobileAlt,
  className,
  priority = false,
}: {
  desktopSrc: string
  mobileSrc: string
  desktopAlt: string
  mobileAlt: string
  className?: string
  priority?: boolean
}) {
  const [device, setDevice] = useState<Device>('mobile')

  return (
    <div className={cn('mx-auto flex w-full max-w-[300px] flex-col items-center', className)}>
      <div
        role="group"
        aria-label="Screenshot device"
        className="mb-5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1"
      >
        {OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={device === id}
            onClick={() => setDevice(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              device === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div
        className="relative w-full"
        style={{ aspectRatio: `${SHOT_WIDTH_MOBILE} / ${SHOT_HEIGHT_MOBILE}` }}
      >
        {device === 'mobile' ? (
          <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border-4 border-border bg-card p-1.5">
            <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
              <Image
                src={mobileSrc}
                alt={mobileAlt}
                fill
                priority={priority}
                sizes="(max-width: 640px) 55vw, 300px"
                className="object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-card"
              style={{ aspectRatio: `${SHOT_WIDTH} / ${SHOT_HEIGHT}` }}
            >
              <Image
                src={desktopSrc}
                alt={desktopAlt}
                fill
                sizes="(max-width: 640px) 55vw, 300px"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
