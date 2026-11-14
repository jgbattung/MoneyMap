/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mcpCompatibility } from './public-client'

const [authorizeHook, tokenHook] = mcpCompatibility.hooks.before

const findOne = vi.fn()

function ctx(over: Record<string, unknown> = {}) {
  return {
    path: '/mcp/token',
    body: {},
    query: {},
    request: { headers: new Headers() },
    context: { adapter: { findOne } },
    ...over,
  } as any
}

describe('mcpCompatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findOne.mockResolvedValue({ clientSecret: 'stored-secret', disabled: false })
  })

  describe('matchers', () => {
    it('only match their own endpoints', () => {
      expect(authorizeHook.matcher({ path: '/mcp/authorize' })).toBe(true)
      expect(authorizeHook.matcher({ path: '/mcp/token' })).toBe(false)
      expect(tokenHook.matcher({ path: '/mcp/token' })).toBe(true)
      expect(tokenHook.matcher({ path: '/sign-in/email' })).toBe(false)
    })
  })

  describe('token exchange for public clients', () => {
    const body = { grant_type: 'authorization_code', client_id: 'c1', code: 'x', code_verifier: 'v' }

    it('fills in the registered secret when the client sent none', async () => {
      const result = await (tokenHook.handler as any)(ctx({ body }))
      expect(result).toEqual({ context: { body: { client_secret: 'stored-secret' } } })
      expect(findOne).toHaveBeenCalledWith({ model: 'oauthApplication', where: [{ field: 'clientId', value: 'c1' }] })
    })

    it.each([
      ['a secret is already sent', { ...body, client_secret: 's' }],
      ['there is no PKCE verifier', { ...body, code_verifier: undefined }],
      ['it is a refresh grant', { ...body, grant_type: 'refresh_token' }],
      ['there is no client_id', { ...body, client_id: undefined }],
    ])('does nothing when %s', async (_label, b) => {
      expect(await (tokenHook.handler as any)(ctx({ body: b }))).toBeUndefined()
      expect(findOne).not.toHaveBeenCalled()
    })

    it('does nothing when Basic auth is used', async () => {
      const request = { headers: new Headers({ authorization: 'Basic abc' }) }
      expect(await (tokenHook.handler as any)(ctx({ body, request }))).toBeUndefined()
    })

    it('does nothing for an unknown or disabled client', async () => {
      findOne.mockResolvedValueOnce(null)
      expect(await (tokenHook.handler as any)(ctx({ body }))).toBeUndefined()
      findOne.mockResolvedValueOnce({ clientSecret: 's', disabled: true })
      expect(await (tokenHook.handler as any)(ctx({ body }))).toBeUndefined()
    })
  })

  describe('authorize with offline_access', () => {
    it('adds prompt=consent when offline_access is requested without a prompt', async () => {
      const result = await (authorizeHook.handler as any)(ctx({ query: { scope: 'openid offline_access' } }))
      expect(result).toEqual({ context: { query: { prompt: 'consent' } } })
    })

    it.each([
      ['a prompt is already set', { scope: 'openid offline_access', prompt: 'login' }],
      ['offline_access is not requested', { scope: 'openid profile' }],
      ['no scope is sent', {}],
    ])('does nothing when %s', async (_label, query) => {
      expect(await (authorizeHook.handler as any)(ctx({ query }))).toBeUndefined()
    })
  })
})

describe('mcpCompatibility social sign-in continuation', () => {
  const [callbackHook] = mcpCompatibility.hooks.after
  function afterCtx(returned: unknown) {
    return { path: '/callback/google', context: { returned } } as any
  }

  it('matches only callback endpoints', () => {
    expect(callbackHook.matcher({ path: '/callback/google' })).toBe(true)
    expect(callbackHook.matcher({ path: '/sign-in/email' })).toBe(false)
    expect(callbackHook.matcher({})).toBe(false)
  })

  it('turns the plugin JSON continuation into a real redirect', async () => {
    const error: any = await (callbackHook.handler as any)(
      afterCtx({ redirect: true, url: 'https://claude.ai/cb?code=abc' })
    ).catch((e: unknown) => e)
    expect(error.statusCode).toBe(302)
    expect(new Headers(error.headers).get('location')).toBe('https://claude.ai/cb?code=abc')
  })

  it.each([
    ['an ordinary redirect error', new Error('302')],
    ['a body without redirect', { url: 'https://x' }],
    ['a body without a url', { redirect: true }],
    ['nothing', undefined],
  ])('does nothing for %s', async (_label, returned) => {
    await expect((callbackHook.handler as any)(afterCtx(returned))).resolves.toBeUndefined()
  })
})
