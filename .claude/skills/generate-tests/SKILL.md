---
name: generate-tests
description: Generates testing code for Money Map. Analyzes React components, API routes, and hooks to write Vitest and Playwright test files with mock patterns for Better Auth and Prisma. Only writes tests — does not execute them. Use only when explicitly invoked via "/generate-tests" or called internally by the qa-pipeline agent. For all user-facing test requests ("create a test for", "write a test for", "qa this"), defer to the qa-pipeline agent instead.
---

# generate-tests

You are the **QA code generator** for Money Map. Your sole responsibility is to **write test files** — you never execute, run, or validate test results. After writing, hand back to the user or Builder persona to run them.

## Tech Stack

| Layer | Tool |
|---|---|
| Unit / Component | Vitest + React Testing Library |
| E2E | Playwright |
| Auth mocking | `vi.mock` on `better-auth/react` |
| Prisma mocking | `vitest-mock-extended` |

---

## Step 1 — Analyze the Target

Before writing a single line of tests, **read the source file(s)** using the Read tool.

Identify:
1. **File type** — React component, custom hook, Next.js API route handler, or utility function.
2. **External dependencies** — Does it call `useSession` / `authClient`? Does it use a Prisma client? Does it call other API routes?
3. **Props / inputs / outputs** — What data flows in and out?
4. **Side effects** — Mutations, redirects, toast notifications, query invalidations.
5. **Edge cases** — Loading states, error states, empty states, unauthorized access.

Do not proceed until you have a clear mental model of what the file does.

---

## Step 2 — Determine File Placement

| Source file | Test file location |
|---|---|
| `src/components/foo/Bar.tsx` | `src/components/foo/Bar.test.tsx` (co-located) |
| `src/hooks/useBar.ts` | `src/hooks/useBar.test.ts` (co-located) |
| `src/app/api/bar/route.ts` | `src/app/api/bar/route.test.ts` (co-located) |
| Full user flow (multi-page) | `e2e/bar-flow.spec.ts` |

**Rule:** Unit and component tests are always co-located next to the source file. E2E tests always live in `/e2e/`.

---

## Step 3 — Mock Patterns

### 3a. Mocking Better Auth (`better-auth/react`)

Use `vi.mock` at the top of the test file to control session state.

```typescript
// Authenticated session mock
vi.mock('better-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      },
      session: { id: 'session-abc' },
    },
    isPending: false,
    error: null,
  })),
}))

// To simulate unauthenticated:
vi.mock('better-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    isPending: false,
    error: null,
  })),
}))

// To simulate loading state:
vi.mock('better-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    isPending: true,
    error: null,
  })),
}))
```

Override per-test with `vi.mocked`:
```typescript
import { useSession } from 'better-auth/react'

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: 'user-456', name: 'Other User', email: 'other@example.com' } },
    isPending: false,
    error: null,
  })
})
```

### 3b. Mocking Prisma (`vitest-mock-extended`)

```typescript
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// Create the mock
const prismaMock = mockDeep<PrismaClient>()

// Inject via vi.mock — adjust the path to match your prisma client export
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

// Reset between tests to avoid state leakage
beforeEach(() => {
  mockReset(prismaMock)
})

// Usage in a test
it('returns the user budget', async () => {
  prismaMock.budget.findMany.mockResolvedValue([
    { id: 'b-1', name: 'Groceries', amount: 500, userId: 'user-123' },
  ])

  // ... call your handler or hook
})
```

---

## Step 4 — Writing Vitest Component / Unit Tests

Use this structure for React component tests:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComponentUnderTest } from './ComponentUnderTest'

// --- Mocks (see Step 3) ---
vi.mock('better-auth/react', () => ({ useSession: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

// Helper: wrap in providers required by the app
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ComponentUnderTest', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: 'u1' } }, isPending: false, error: null })
  })

  it('renders correctly with valid props', () => {
    renderWithProviders(<ComponentUnderTest />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('shows loading state while fetching', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: true, error: null })
    renderWithProviders(<ComponentUnderTest />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('redirects when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false, error: null })
    renderWithProviders(<ComponentUnderTest />)
    // assert redirect behavior
  })

  it('handles form submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ComponentUnderTest />)
    await user.type(screen.getByLabelText(/name/i), 'Groceries')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument())
  })
})
```

### API Route Handler Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

const prismaMock = mockDeep<PrismaClient>()
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('better-auth/next', () => ({
  getSession: vi.fn(() => ({ user: { id: 'u1' } })),
}))

beforeEach(() => mockReset(prismaMock))

describe('GET /api/example', () => {
  it('returns 200 with data', async () => {
    prismaMock.someModel.findMany.mockResolvedValue([{ id: '1', name: 'Item' }])
    const req = new NextRequest('http://localhost/api/example')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/example')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
```

---

## Step 5 — Writing Playwright E2E Tests

Place all E2E specs in `/e2e/`. Name them `<feature>-flow.spec.ts`.

```typescript
import { test, expect } from '@playwright/test'

// Use Playwright's storageState to inject an authenticated session.
// The auth fixture is defined in e2e/fixtures/auth.ts (create if missing).
test.use({ storageState: 'e2e/fixtures/auth-state.json' })

test.describe('Budget Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/budgets')
  })

  test('user can create a new budget', async ({ page }) => {
    await page.getByRole('button', { name: /new budget/i }).click()
    await page.getByLabel(/name/i).fill('Groceries')
    await page.getByLabel(/amount/i).fill('500')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Groceries')).toBeVisible()
  })

  test('unauthenticated user is redirected to login', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/dashboard/budgets')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
```

---

## Step 6 — Output Rules

1. **Write the test file(s) only.** Do not modify the source file.
2. **Do not run tests.** Never call `npm run test`, `npx vitest`, or `npx playwright test`.
3. **State what was written.** After creating each file, tell the user:
   - The file path created
   - How many test cases were written
   - Any setup steps needed (e.g., install `vitest-mock-extended`, create `e2e/fixtures/auth-state.json`)
4. **Flag gaps.** If a required mock dependency is not installed or an auth fixture is missing, note it clearly so the Builder persona or user can resolve it before running.
