/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMcpSession = vi.hoisted(() => vi.fn())
const getSnapshot = vi.hoisted(() => vi.fn())
const searchTransactions = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({ auth: { api: { getMcpSession } } }))
vi.mock('@/lib/prisma', () => ({ db: {} }))
vi.mock('@/lib/mcp/queries/snapshot', () => ({ getSnapshot }))
vi.mock('@/lib/mcp/queries/search', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mcp/queries/search')>('@/lib/mcp/queries/search')
  return { ...actual, searchTransactions }
})

import { POST } from './route'
import { TOOL_NAMES } from '@/lib/mcp/tools'

const ORIGIN = 'https://money.example.com'

function rpc(body: unknown, token: string | null = 'tok') {
  return new Request(`${ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function parse(res: Response) {
  const text = await res.text()
  // Streamable HTTP may answer as JSON or as a single SSE `data:` event.
  const data = text.startsWith('event:') || text.includes('\ndata:') || text.startsWith('data:')
    ? text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim())[0]
    : text
  return JSON.parse(data)
}

const validSession = () => ({
  accessToken: 'tok',
  clientId: 'c1',
  userId: 'user-1',
  scopes: 'openid',
  accessTokenExpiresAt: new Date(Date.now() + 60_000),
})

describe('POST /api/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMcpSession.mockResolvedValue(validSession())
  })

  it('rejects a request without a valid token with a 401 challenge on the real origin', async () => {
    getMcpSession.mockResolvedValue(null)
    const res = await POST(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null))
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`
    )
  })

  it('lists the nine read-only tools', async () => {
    const res = await POST(rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }))
    expect(res.status).toBe(200)
    const body = await parse(res)
    const tools = body.result.tools as any[]
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort())
    expect(tools).toHaveLength(9)
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true)
      expect(t.description.length).toBeGreaterThan(20)
    }
    const search = tools.find((t) => t.name === 'search_transactions')
    expect(search.description).toContain('kind: "expense"')
  })

  it('calls a tool with the userId from the token and returns JSON text', async () => {
    getSnapshot.mockResolvedValue({ netWorth: 123.45 })
    const res = await POST(rpc({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'get_snapshot', arguments: {} },
    }))
    const body = await parse(res)
    expect(getSnapshot).toHaveBeenCalledWith('user-1')
    expect(JSON.parse(body.result.content[0].text)).toEqual({ netWorth: 123.45 })
    expect(body.result.isError).toBeFalsy()
  })

  it('applies tool argument defaults and validates arguments', async () => {
    searchTransactions.mockResolvedValue({ transactions: [] })
    await POST(rpc({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'search_transactions', arguments: { kind: 'expense', tag: 'Taiwan' } },
    }))
    expect(searchTransactions).toHaveBeenCalledWith('user-1', expect.objectContaining({ kind: 'expense', tag: 'Taiwan', take: 20 }))

    searchTransactions.mockClear()
    const bad = await POST(rpc({
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'search_transactions', arguments: { take: 500 } },
    }))
    const body = await parse(bad)
    expect(searchTransactions).not.toHaveBeenCalled()
    expect(body.error || body.result?.isError).toBeTruthy()
  })

  it('returns an MCP error result without leaking the stack when a query throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getSnapshot.mockRejectedValue(new Error('connection refused at db.internal:5432'))
    const res = await POST(rpc({
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'get_snapshot', arguments: {} },
    }))
    const body = await parse(res)
    expect(body.result.isError).toBe(true)
    expect(JSON.stringify(body)).not.toContain('db.internal')
    spy.mockRestore()
  })
})
