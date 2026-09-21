import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SHOT_HEIGHT, SHOT_WIDTH } from './constants'

/**
 * A product screenshot in a framed surface.
 *
 * The frame is a hairline border over the card surface rather than a drop shadow: the
 * app's own surfaces are separated the same way, and a glow here would read as a
 * marketing flourish bolted onto a product that does not use them.
 */
export function Shot({
  src,
  alt,
  priority = false,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1100px',
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
  sizes?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-card',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={SHOT_WIDTH}
        height={SHOT_HEIGHT}
        priority={priority}
        sizes={sizes}
        className="h-auto w-full"
      />
    </div>
  )
}
