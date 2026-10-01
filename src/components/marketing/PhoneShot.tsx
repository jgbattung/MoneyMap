import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SHOT_WIDTH_MOBILE, SHOT_HEIGHT_MOBILE } from './constants'

/**
 * A static phone-framed mobile screenshot.
 *
 * Replaces the per-section Desktop/Mobile toggle component that used to sit here
 * (cut in Amendment 3 after the user reviewed the build on a large monitor): every
 * feature section now shows the mobile capture only, in a phone bezel, with no
 * control to switch it. Because there is no interactive state left to manage, this
 * is a plain Server Component with no client-side JS of its own.
 */
export function PhoneShot({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[1.75rem] border-4 border-border bg-card p-1.5',
        className,
      )}
      style={{ aspectRatio: `${SHOT_WIDTH_MOBILE} / ${SHOT_HEIGHT_MOBILE}` }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="300px"
          className="object-cover"
        />
      </div>
    </div>
  )
}
