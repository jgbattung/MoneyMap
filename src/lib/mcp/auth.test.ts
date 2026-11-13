import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMcpSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: { api: { getMcpSession } } }))

import { withMcpUser } from './auth'

const URL_ = 'https://example.com/api/mcp'

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'tok',
    clientId: 'client-1',
    userId: 'user-1',
    scopes: 'openid offline_access',
    accessTokenExpiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  }
}

function makeRequest() {
  return new Request(URL_, { method: 'POST', headers: { authorization: 'Bearer tok' } })
}

describe('withMcpUser', () => {
  const handler = vi.fn(async () => new Response('ok'))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 with a challenge built from the request origin when there is no token', async () => {
    getMcpSession.mockResolvedValue(null)

    const res = await withMcpUser(handler)(new Request(URL_, { method: 'POST' }))

    expect(res.status).toBe(401)
    const challenge = res.headers.get('WWW-Authenticate')!
    expect(challenge).toBe('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource"')
    expect(challenge).not.toContain('localhost')
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns a JSON-RPC error body on 401', async () => {
    getMcpSession.mockResolvedValue(null)
    const res = await withMcpUser(handler)(makeRequest())
    const body = await res.json()
    expect(body.jsonrpc).toBe('2.0')
    expect(body.error.message).toMatch(/Unauthorized/)
  })

  it('passes the userId to the handler for a valid session and exposes it via req.auth', async () => {
    getMcpSession.mockResolvedValue(makeSession())
    const req = makeRequest()

    const res = await withMcpUser(handler)(req)

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(req, 'user-1')
    expect((req as unknown as { auth: { extra: { userId: string }; scopes: string[] } }).auth.extra.userId).toBe('user-1')
    expect((req as unknown as { auth: { scopes: string[] } }).auth.scopes).toEqual(['openid', 'offline_access'])
  })

  it('returns 401 when the session has no userId', async () => {
    getMcpSession.mockResolvedValue(makeSession({ userId: null }))
    const res = await withMcpUser(handler)(makeRequest())
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 401 when the access token has expired', async () => {
    getMcpSession.mockResolvedValue(makeSession({ accessTokenExpiresAt: new Date(Date.now() - 1000) }))
    const res = await withMcpUser(handler)(makeRequest())
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('accepts an ISO string expiry', async () => {
    getMcpSession.mockResolvedValue(makeSession({ accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString() }))
    const res = await withMcpUser(handler)(makeRequest())
    expect(res.status).toBe(200)
  })
})
