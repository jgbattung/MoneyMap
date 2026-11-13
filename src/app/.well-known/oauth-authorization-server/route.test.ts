import { describe, it, expect, vi } from 'vitest'

const metadataHandler = vi.hoisted(() =>
  vi.fn(async (req: Request) => Response.json({ issuer: new URL(req.url).origin }))
)

vi.mock('@/lib/auth', () => ({ auth: { api: { getMcpOAuthConfig: vi.fn() } } }))
vi.mock('better-auth/plugins', () => ({
  oAuthDiscoveryMetadata: vi.fn(() => metadataHandler),
}))

import { oAuthDiscoveryMetadata } from 'better-auth/plugins'
import { auth } from '@/lib/auth'
import { GET, dynamic } from './route'

describe('GET /.well-known/oauth-authorization-server', () => {
  it('delegates to better-auth discovery metadata built from the auth instance', async () => {
    expect(oAuthDiscoveryMetadata).toHaveBeenCalledWith(auth)
    expect(GET).toBe(metadataHandler)
  })

  it('answers a signed-out request with 200 JSON', async () => {
    const res = await GET(new Request('https://money.example.com/.well-known/oauth-authorization-server'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ issuer: 'https://money.example.com' })
  })

  it('is never statically cached', () => {
    expect(dynamic).toBe('force-dynamic')
  })
})
