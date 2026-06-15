"use client"

import { useEffect, useState } from 'react'
import { useSpring, useTransform, useReducedMotion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
}

/**
 * Renders a number that smoothly counts up/down to `value` using a spring
 * animation. When `prefers-reduced-motion` is active, renders the formatted
 * value immediately without any animation.
 */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion()
  const springValue = useSpring(0, { duration: 700, bounce: 0 })
  const displayValue = useTransform(springValue, (v) => format(v))
  const [text, setText] = useState(() => format(0))

  useEffect(() => {
    if (prefersReducedMotion) {
      setText(format(value))
      return
    }
    springValue.set(value)
  }, [value, prefersReducedMotion, springValue, format])

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => setText(v))
    return unsubscribe
  }, [displayValue])

  return <>{text}</>
}
