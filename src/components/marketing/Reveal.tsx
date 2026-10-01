'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUINT, MOTION_DURATION } from '@/lib/motion'

/**
 * The landing page's only motion primitive: content rises a little as it enters.
 *
 * Isolated as a `'use client'` leaf so the sections themselves stay Server Components.
 * Motion is restrained on purpose (MOTION_INTENSITY 4): it exists to give the page a
 * sense of sequence as you scroll, not to perform. It animates `transform` and `opacity`
 * only, and collapses to a plain static render under `prefers-reduced-motion`, matching
 * the reduced-motion rule already in `globals.css`.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: MOTION_DURATION.reveal, delay, ease: EASE_OUT_QUINT }}
    >
      {children}
    </motion.div>
  )
}
