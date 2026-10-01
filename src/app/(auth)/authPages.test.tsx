import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const social = vi.fn()

vi.mock('@/lib/auth-client', () => ({
  signIn: {
    email: vi.fn(),
    social: (...args: unknown[]) => social(...args),
  },
  signUp: { email: vi.fn() },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import SignIn from './sign-in/page'
import SignUp from './sign-up/page'

beforeEach(() => {
  social.mockClear()
})

/**
 * These pages were the app's entire first impression before the landing page existed,
 * and they had accumulated three faults: a light-mode background in a dark-only app, and
 * two social buttons wired to nothing. The assertions below exist so none of those can
 * come back unnoticed.
 */
describe.each([
  { name: 'sign-in', Component: SignIn },
  { name: 'sign-up', Component: SignUp },
])('$name page', ({ Component }) => {
  it('has no light-mode background class', () => {
    const { container } = render(<Component />)
    expect(container.innerHTML).not.toContain('bg-zinc-50')
  })

  it('offers only the social provider that is actually configured', () => {
    // src/lib/auth.ts configures google and nothing else.
    render(<Component />)
    expect(screen.getByRole('button', { name: /google/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /facebook/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /microsoft/i })).toBeNull()
  })

  it('wires the Google button to a real sign-in call', () => {
    render(<Component />)
    screen.getByRole('button', { name: /google/i }).click()
    expect(social).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/dashboard' })
  })

  it('has no control that points nowhere', () => {
    const { container } = render(<Component />)
    const deadLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) => (a.getAttribute('href') ?? '') === '#',
    )
    expect(deadLinks.map((a) => a.textContent)).toEqual([])
  })

  it('every button either submits the form or has a click handler', () => {
    const { container } = render(<Component />)
    const buttons = Array.from(container.querySelectorAll('button'))
    // Rendered React props are not inspectable from the DOM, so this asserts the
    // observable proxy: a type="button" with no behaviour is what the dead social
    // buttons were. Clicking each non-submit button must reach a handler.
    const nonSubmit = buttons.filter((b) => b.getAttribute('type') === 'button')
    expect(nonSubmit).toHaveLength(1)
    expect(nonSubmit[0].textContent).toContain('Google')
  })
})

describe('sign-in page', () => {
  it('does not advertise a password reset that does not exist', () => {
    // better-auth has no sendResetPassword handler configured and there is no reset
    // route in the app, so the old "Forgot your Password ?" link pointed at "#".
    render(<SignIn />)
    expect(screen.queryByText(/forgot your password/i)).toBeNull()
  })

  it('keeps the email and password fields labelled and required', () => {
    const { container } = render(<SignIn />)
    const email = container.querySelector('#email')
    const pwd = container.querySelector('#pwd')
    expect(email?.getAttribute('required')).not.toBeNull()
    expect(pwd?.getAttribute('required')).not.toBeNull()
    expect(container.querySelector('label[for="email"]')?.textContent).toContain('Email')
    expect(container.querySelector('label[for="pwd"]')?.textContent).toContain('Password')
  })

  it('links to sign-up', () => {
    render(<SignIn />)
    expect(screen.getByRole('link', { name: /create account/i }).getAttribute('href')).toBe(
      '/sign-up',
    )
  })
})

describe('sign-up page', () => {
  it('links to sign-in', () => {
    render(<SignUp />)
    expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe('/sign-in')
  })
})
