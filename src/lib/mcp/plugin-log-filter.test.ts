import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installPluginLogFilter, isPluginLeak } from './plugin-log-filter'

describe('isPluginLeak', () => {
  it('matches the registered client row (it carries the client secret)', () => {
    expect(isPluginLeak({ id: '1', clientId: 'c', clientSecret: 'shh', redirectURLs: ['x'] })).toBe(true)
  })

  it('matches the raw authorize query', () => {
    expect(isPluginLeak({ client_id: 'c', response_type: 'code', code_challenge: 'x', state: 's' })).toBe(true)
  })

  it.each([
    ['a string', 'hello'],
    ['null', null],
    ['an Error', new Error('boom')],
    ['an unrelated object', { user: 'a', count: 2 }],
    ['an object with only client_id', { client_id: 'c' }],
  ])('does not match %s', (_label, value) => {
    expect(isPluginLeak(value)).toBe(false)
  })
})

describe('installPluginLogFilter', () => {
  const original = console.log
  const sink = vi.fn()

  beforeEach(() => {
    sink.mockClear()
    console.log = sink as unknown as typeof console.log
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('money-map.mcp-plugin-log-filter')]
    installPluginLogFilter()
  })

  afterEach(() => {
    console.log = original
  })

  it('drops the client row and the authorize query', () => {
    console.log({ clientId: 'c', clientSecret: 'shh' })
    console.log({ client_id: 'c', response_type: 'code' })
    expect(sink).not.toHaveBeenCalled()
  })

  it('passes every other console.log through unchanged', () => {
    console.log('plain message', 42)
    console.log({ some: 'data' })
    console.log(new Error('still visible'))
    expect(sink).toHaveBeenCalledTimes(3)
    expect(sink).toHaveBeenNthCalledWith(1, 'plain message', 42)
  })

  it('does not touch console.error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    console.error({ clientId: 'c', clientSecret: 'shh' })
    expect(err).toHaveBeenCalledTimes(1)
    err.mockRestore()
  })

  it('wraps only once when installed repeatedly', () => {
    installPluginLogFilter()
    installPluginLogFilter()
    console.log('once')
    expect(sink).toHaveBeenCalledTimes(1)
  })
})
