import { describe, it, expect, vi } from 'vitest'

const metadataHandler = vi.hoisted(() =>
  vi.fn(async (req: Request) =>
    Response.json(
      {
        issuer: new URL(req.url).origin,
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      },
      { headers: { 'access-control-allow-origin': '*' } }
    )
  )
)

vi.mock('@/lib/auth', () => ({ auth: { api: { getMcpOAuthConfig: vi.fn() } } }))
vi.mock('better-auth/plugins', () => ({
  oAuthDiscoveryMetadata: vi.fn(() => metadataHandler),
}))

import { oAuthDiscoveryMetadata } from 'better-auth/plugins'
import { auth } from '@/lib/auth'
import { GET, dynamic } from './route'

describe('GET /.well-known/oauth-authorization-server', () => {
  it('builds the metadata handler from the auth instance', () => {
    expect(oAuthDiscoveryMetadata).toHaveBeenCalledWith(auth)
  })

  it('answers a signed-out request with 200 JSON that follows the request origin', async () => {
    const res = await GET(new Request('https://money.example.com/.well-known/oauth-authorization-server'))
    expect(res.status).toBe(200)
    expect((await res.json()).issuer).toBe('https://money.example.com')
  })

  it('also advertises refresh_token and public-client (none) auth', async () => {
    const body = await (await GET(new Request('https://money.example.com/x'))).json()
    expect(body.grant_types_supported).toEqual(['authorization_code', 'refresh_token'])
    expect(body.token_endpoint_auth_methods_supported).toEqual(['client_secret_basic', 'client_secret_post', 'none'])
  })

  it('keeps the CORS headers from better-auth', async () => {
    const res = await GET(new Request('https://money.example.com/x'))
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('is never statically cached', () => {
    expect(dynamic).toBe('force-dynamic')
  })
})
