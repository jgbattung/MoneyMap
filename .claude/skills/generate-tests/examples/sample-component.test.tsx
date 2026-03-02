// @ts-nocheck
// NOTE: This is a reference/example file only. It imports a hypothetical
// ExpenseList component that does not exist. TypeScript errors here are expected
// and intentional — this file is documentation, not production code.
/**
 * SAMPLE TEST — Money Map
 * Target: A hypothetical ExpenseList React component
 *
 * This file illustrates the expected structure for component test files.
 * Use this as a reference when generating tests with the generate-tests skill.
 *
 * Key patterns demonstrated:
 * - Mocking Better Auth (useSession)
 * - Mocking TanStack Query (via QueryClientProvider with retry:false)
 * - Testing: happy path, loading state, unauthenticated state, empty state
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'better-auth/react'
import { ExpenseList } from './ExpenseList'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('better-auth/react', () => ({
    useSession: vi.fn(),
}))

// ─── Test Helpers ─────────────────────────────────────────────────────────────

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

const MOCK_USER = {
    data: {
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        session: { id: 'session-abc' },
    },
    isPending: false,
    error: null,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExpenseList', () => {
    beforeEach(() => {
        vi.mocked(useSession).mockReturnValue(MOCK_USER as any)
    })

    it('renders the expense list for an authenticated user', async () => {
        renderWithProviders(<ExpenseList />)
        await waitFor(() => {
            expect(screen.getByRole('list')).toBeInTheDocument()
        })
    })

    it('shows a loading skeleton while data is being fetched', () => {
        vi.mocked(useSession).mockReturnValue({ ...MOCK_USER, isPending: true } as any)
        renderWithProviders(<ExpenseList />)
        expect(screen.getByTestId('expense-list-skeleton')).toBeInTheDocument()
    })

    it('redirects to sign-in when the user is not authenticated', () => {
        vi.mocked(useSession).mockReturnValue({
            data: null,
            isPending: false,
            error: null,
        } as any)
        renderWithProviders(<ExpenseList />)
        expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('shows an empty state message when there are no expenses', async () => {
        renderWithProviders(<ExpenseList />)
        await waitFor(() => {
            expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument()
        })
    })

    it('allows the user to delete an expense', async () => {
        const user = userEvent.setup()
        renderWithProviders(<ExpenseList />)
        await waitFor(() => screen.getByRole('list'))
        const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
        await user.click(deleteButton)
        await waitFor(() => {
            expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
        })
    })
})
