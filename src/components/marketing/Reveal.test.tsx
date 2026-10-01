import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

/**
 * `Reveal` is the landing page's only client component and its only motion primitive.
 *
 * It needs its own test file because `LandingPage.test.tsx` mocks framer-motion at
 * file scope with a hardcoded `useReducedMotion: () => false` and a `motion` proxy
 * that discards every animation prop. That mock is correct for the copy and markup
 * assertions it exists to serve, but it means two things were never covered anywhere:
 *
 *   1. The `prefers-reduced-motion` branch, which the spec requires ("Motion restrained
 *      and respecting `prefers-reduced-motion`"). Under the global mock that branch is
 *      unreachable, so the suite was green whether or not it worked. This is the same
 *      shape as this repo's recorded inert-mock lesson, where a Calendar mocked as a
 *      bare div left the date pickers with zero coverage behind a green suite.
 *   2. The animation configuration itself - which properties animate, and that it
 *      plays once. A Reveal that animated `height` or re-fired on every scroll would
 *      have passed every existing assertion.
 *
 * So this file mocks framer-motion differently: `useReducedMotion` is switchable per
 * test, and the `motion` proxy CAPTURES the props it is handed instead of dropping
 * them.
 */

const motionState = vi.hoisted(() => ({
  reduceMotion: false as boolean | null,
  lastProps: null as Record<string, unknown> | null,
}))

vi.mock('framer-motion', () => ({
  useReducedMotion: () => motionState.reduceMotion,
  motion: new Proxy(
    {},
    {
      get: () =>
        function MockMotion({
          children,
          className,
          ...rest
        }: {
          children?: React.ReactNode
          className?: string
          [key: string]: unknown
        }) {
          motionState.lastProps = rest
          return (
            <div data-testid="motion-div" className={className}>
              {children}
            </div>
          )
        },
    },
  ),
}))

import { Reveal } from './Reveal'
import { EASE_OUT_QUINT, MOTION_DURATION } from '@/lib/motion'

beforeEach(() => {
  motionState.reduceMotion = false
  motionState.lastProps = null
})

describe('Reveal: prefers-reduced-motion', () => {
  it('renders a plain static div with no motion props when reduced motion is requested', () => {
    motionState.reduceMotion = true
    render(
      <Reveal className="test-class">
        <p>content</p>
      </Reveal>,
    )

    expect(screen.getByText('content')).toBeTruthy()
    // The motion component must not be involved at all - not merely configured with a
    // zero duration, which would still run a transition.
    expect(screen.queryByTestId('motion-div')).toBeNull()
    expect(motionState.lastProps).toBeNull()
  })

  it('still forwards className under reduced motion, so layout does not shift', () => {
    motionState.reduceMotion = true
    const { container } = render(
      <Reveal className="mt-12 grid">
        <p>content</p>
      </Reveal>,
    )
    expect(container.firstElementChild?.className).toBe('mt-12 grid')
  })

  it('still renders its children under reduced motion', () => {
    // The failure mode worth guarding: a reduced-motion branch that returns null or an
    // empty wrapper hides the entire page from anyone with the OS setting enabled.
    motionState.reduceMotion = true
    render(
      <Reveal>
        <h2>Watch it go up.</h2>
        <p>subhead</p>
      </Reveal>,
    )
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
    expect(screen.getByText('subhead')).toBeTruthy()
  })

  it('animates when reduced motion is not requested', () => {
    motionState.reduceMotion = false
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    expect(screen.getByTestId('motion-div')).toBeTruthy()
    expect(motionState.lastProps).not.toBeNull()
  })
})

describe('Reveal: animation configuration', () => {
  it('animates transform and opacity only, never a layout-triggering property', () => {
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    const props = motionState.lastProps!
    expect(props.initial).toEqual({ opacity: 0, y: 16 })
    expect(props.whileInView).toEqual({ opacity: 1, y: 0 })

    // Animating width/height/top/left would force layout on every frame. Assert the
    // absence explicitly rather than trusting the shape above to stay minimal.
    const animated = Object.keys({
      ...(props.initial as object),
      ...(props.whileInView as object),
    })
    for (const key of ['width', 'height', 'top', 'left', 'margin', 'padding']) {
      expect(animated, `Reveal must not animate "${key}"`).not.toContain(key)
    }
  })

  it('plays once, so scrolling back up does not re-run the page', () => {
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    expect(motionState.lastProps!.viewport).toEqual({ once: true, amount: 0.25 })
  })

  it('takes its duration and easing from the shared motion language, not local values', () => {
    // Retuning motion is meant to happen in one place (src/lib/motion.ts). A hardcoded
    // duration here would drift away from the rest of the app silently.
    render(
      <Reveal delay={0.08}>
        <p>content</p>
      </Reveal>,
    )
    expect(motionState.lastProps!.transition).toEqual({
      duration: MOTION_DURATION.reveal,
      delay: 0.08,
      ease: EASE_OUT_QUINT,
    })
  })

  it('defaults to no delay', () => {
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    expect((motionState.lastProps!.transition as { delay: number }).delay).toBe(0)
  })
})
