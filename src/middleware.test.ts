import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@better-fetch/fetch', () => ({
  betterFetch: vi.fn(),
}))

// next/server stubs — we only need the subset used by middleware
vi.mock('next/server', () => {
  const redirect = vi.fn((url: URL) => ({
    type: 'redirect',
    url: url.toString(),
  }))

  const next = vi.fn(() => ({ type: 'next' }))

  return {
    NextRequest: vi.fn(),
    NextResponse: { redirect, next },
  }
})

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { betterFetch } from '@better-fetch/fetch'
import { NextResponse } from 'next/server'
import { middleware } from './middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(pathname: string, origin = 'http://localhost:3000') {
  return {
    nextUrl: {
      origin,
      pathname,
    },
    url: `${origin}${pathname}`,
    headers: {
      get: vi.fn(() => 'session-cookie=abc'),
    },
  } as unknown as import('next/server').NextRequest
}

function mockSession(session: unknown) {
  vi.mocked(betterFetch).mockResolvedValue({ data: session, error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
})

describe('middleware', () => {
  // -------------------------------------------------------------------------
  describe('authenticated user redirects', () => {
    it('redirects authenticated user on "/" to /dashboard', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/dashboard')
    })

    it('redirects authenticated user on "/sign-in" to /dashboard', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/sign-in'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/dashboard')
    })

    it('redirects authenticated user on "/sign-up" to /dashboard', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/sign-up'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/dashboard')
    })

    it('does NOT redirect authenticated user on a protected page like /dashboard', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/dashboard'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
    })

    it('does NOT redirect authenticated user on /transactions', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/transactions'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
    })

    it('does NOT redirect authenticated user on /accounts', async () => {
      mockSession({ user: { id: 'user-123' } })
      await middleware(makeRequest('/accounts'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('unauthenticated user redirects', () => {
    it('redirects unauthenticated user on "/" to /sign-in', async () => {
      mockSession(null)
      await middleware(makeRequest('/'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/sign-in')
    })

    it('redirects unauthenticated user on /dashboard to /sign-in', async () => {
      mockSession(null)
      await middleware(makeRequest('/dashboard'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/sign-in')
    })

    it('redirects unauthenticated user on /transactions to /sign-in', async () => {
      mockSession(null)
      await middleware(makeRequest('/transactions'))

      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL
      expect(redirectArg.toString()).toContain('/sign-in')
    })

    it('allows unauthenticated user to reach /sign-in without redirect', async () => {
      mockSession(null)
      await middleware(makeRequest('/sign-in'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
    })

    it('allows unauthenticated user to reach /sign-up without redirect', async () => {
      mockSession(null)
      await middleware(makeRequest('/sign-up'))

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('betterFetch call', () => {
    it('calls betterFetch with /api/auth/get-session and forwards cookies', async () => {
      mockSession(null)
      const req = makeRequest('/sign-in')
      await middleware(req)

      expect(betterFetch).toHaveBeenCalledWith(
        '/api/auth/get-session',
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          headers: expect.objectContaining({
            cookie: 'session-cookie=abc',
          }),
        }),
      )
    })

    it('falls back to empty string when the cookie header is absent', async () => {
      mockSession(null)
      const req = makeRequest('/sign-in')
      vi.mocked(req.headers.get).mockReturnValue(null)
      await middleware(req)

      expect(betterFetch).toHaveBeenCalledWith(
        '/api/auth/get-session',
        expect.objectContaining({
          headers: expect.objectContaining({ cookie: '' }),
        }),
      )
    })
  })

  // -------------------------------------------------------------------------
  describe('config export', () => {
    it('exports a matcher that excludes _next/static paths', async () => {
      const { config } = await import('./middleware')
      expect(config.matcher).toBeDefined()
      expect(Array.isArray(config.matcher)).toBe(true)
      // The pattern should exclude _next, api, and favicon.ico
      const pattern = config.matcher[0]
      expect(pattern).toContain('_next/static')
      expect(pattern).toContain('favicon.ico')
    })
  })
})
