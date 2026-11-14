import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /.well-known/oauth-protected-resource', () => {
  it('returns the resource metadata JSON', async () => {
    const res = await GET(new Request('http://localhost:3000/.well-known/oauth-protected-resource'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      resource: 'http://localhost:3000/api/mcp',
      authorization_servers: ['http://localhost:3000'],
      bearer_methods_supported: ['header'],
    })
  })

  it('follows the request origin instead of a hardcoded host', async () => {
    const res = await GET(new Request('https://money.example.com/.well-known/oauth-protected-resource'))
    const body = await res.json()
    expect(body.resource).toBe('https://money.example.com/api/mcp')
    expect(body.authorization_servers).toEqual(['https://money.example.com'])
    expect(JSON.stringify(body)).not.toContain('localhost')
  })
})
