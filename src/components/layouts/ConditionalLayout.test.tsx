import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the component
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth-client', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } },
    isPending: false,
    error: null,
  })),
}))

vi.mock('@/components/shared/Sidebar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'sidebar' }),
}))

vi.mock('@/components/shared/BottomBar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'bottombar' }),
}))

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import ConditionalLayout from './ConditionalLayout'
import { useSession } from '@/lib/auth-client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLayout(children = React.createElement('main', { 'data-testid': 'page-content' }, 'Page Content')) {
  return render(React.createElement(ConditionalLayout, null, children))
}

type UseSessionReturn = {
  data: { user: { id: string; name: string; email: string } } | null
  isPending: boolean
  error: null
}

function mockUseSession(overrides: Partial<UseSessionReturn>) {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } },
    isPending: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useSession>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  // Default: authenticated, not pending
  mockUseSession({})
})

describe('ConditionalLayout', () => {
  // -------------------------------------------------------------------------
  describe('authenticated state (session present, not pending)', () => {
    it('renders the Sidebar', () => {
      renderLayout()
      expect(screen.getByTestId('sidebar')).toBeTruthy()
    })

    it('renders the BottomBar', () => {
      renderLayout()
      expect(screen.getByTestId('bottombar')).toBeTruthy()
    })

    it('renders children inside the content wrapper', () => {
      renderLayout()
      expect(screen.getByTestId('page-content')).toBeTruthy()
      expect(screen.getByText('Page Content')).toBeTruthy()
    })

    it('wraps children in a flex-1 overflow-auto div', () => {
      renderLayout()
      const contentWrapper = screen.getByTestId('page-content').parentElement
      expect(contentWrapper?.className).toContain('flex-1')
      expect(contentWrapper?.className).toContain('overflow-auto')
    })
  })

  // -------------------------------------------------------------------------
  describe('loading state (isPending true — the flash fix)', () => {
    beforeEach(() => {
      mockUseSession({ data: null, isPending: true })
    })

    it('does NOT render the Sidebar while auth is pending', () => {
      renderLayout()
      expect(screen.queryByTestId('sidebar')).toBeNull()
    })

    it('does NOT render the BottomBar while auth is pending', () => {
      renderLayout()
      expect(screen.queryByTestId('bottombar')).toBeNull()
    })

    it('still renders children while auth is pending', () => {
      renderLayout()
      expect(screen.getByTestId('page-content')).toBeTruthy()
    })

    it('renders a sidebar placeholder with w-56 to prevent layout shift', () => {
      const { container } = renderLayout()
      const placeholder = container.querySelector('.w-56')
      expect(placeholder).toBeTruthy()
      expect(placeholder?.className).toContain('hidden')
      expect(placeholder?.className).toContain('md:flex')
    })

    it('renders a bottombar placeholder with h-14 to prevent layout shift', () => {
      const { container } = renderLayout()
      const placeholder = container.querySelector('.h-14')
      expect(placeholder).toBeTruthy()
      expect(placeholder?.className).toContain('md:hidden')
      expect(placeholder?.className).toContain('fixed')
    })

    it('wraps children in flex-1 overflow-auto during pending state', () => {
      renderLayout()
      const contentWrapper = screen.getByTestId('page-content').parentElement
      expect(contentWrapper?.className).toContain('flex-1')
      expect(contentWrapper?.className).toContain('overflow-auto')
    })
  })

  // -------------------------------------------------------------------------
  describe('unauthenticated state (no session, not pending)', () => {
    beforeEach(() => {
      mockUseSession({ data: null, isPending: false })
    })

    it('does NOT render the Sidebar when there is no session', () => {
      renderLayout()
      expect(screen.queryByTestId('sidebar')).toBeNull()
    })

    it('does NOT render the BottomBar when there is no session', () => {
      renderLayout()
      expect(screen.queryByTestId('bottombar')).toBeNull()
    })

    it('still renders children when unauthenticated', () => {
      renderLayout()
      expect(screen.getByTestId('page-content')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  describe('transition: loading -> authenticated', () => {
    it('shows nav chrome only after isPending becomes false and session is present', () => {
      // First render: loading
      mockUseSession({ data: null, isPending: true })
      const { rerender } = renderLayout()
      expect(screen.queryByTestId('sidebar')).toBeNull()

      // Second render: authenticated
      mockUseSession({ data: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } }, isPending: false })
      rerender(
        React.createElement(
          ConditionalLayout,
          null,
          React.createElement('main', { 'data-testid': 'page-content' }, 'Page Content'),
        ),
      )
      expect(screen.getByTestId('sidebar')).toBeTruthy()
      expect(screen.getByTestId('bottombar')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  describe('children rendering variety', () => {
    it('renders multiple children when authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } },
        isPending: false,
        error: null,
      } as ReturnType<typeof useSession>)

      render(
        React.createElement(
          ConditionalLayout,
          null,
          React.createElement('div', { 'data-testid': 'child-one' }),
          React.createElement('div', { 'data-testid': 'child-two' }),
        ),
      )

      expect(screen.getByTestId('child-one')).toBeTruthy()
      expect(screen.getByTestId('child-two')).toBeTruthy()
    })
  })
})
