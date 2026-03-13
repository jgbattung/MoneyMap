import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import More from './page';

// ---------------------------------------------------------------------------
// Icon helpers — defined with vi.hoisted so they are available when vi.mock
// factories are hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------
const { mockIcon, mockActiveIcon } = vi.hoisted(() => {
  const mockIcon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
    };

  const mockActiveIcon = (name: string) =>
    function MockActiveIcon(props: Record<string, unknown>) {
      return React.createElement('span', { 'data-testid': `active-icon-${name}`, ...props });
    };

  return { mockIcon, mockActiveIcon };
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

vi.mock('@/app/constants/navigation', () => ({
  navRoutes: [
    { name: 'Dashboard',    path: '/dashboard',    icon: mockIcon('dashboard'),    activeIcon: mockActiveIcon('dashboard') },
    { name: 'Accounts',     path: '/accounts',     icon: mockIcon('accounts'),     activeIcon: mockActiveIcon('accounts') },
    { name: 'Cards',        path: '/cards',        icon: mockIcon('cards'),        activeIcon: mockActiveIcon('cards') },
    { name: 'Transactions', path: '/transactions', icon: mockIcon('transactions'), activeIcon: mockActiveIcon('transactions') },
    { name: 'Expenses',     path: '/expenses',     icon: mockIcon('expenses'),     activeIcon: mockActiveIcon('expenses') },
    { name: 'Income',       path: '/income',       icon: mockIcon('income'),       activeIcon: mockActiveIcon('income') },
    { name: 'Transfers',    path: '/transfers',    icon: mockIcon('transfers'),    activeIcon: mockActiveIcon('transfers') },
    { name: 'Budgets',      path: '/budgets',      icon: mockIcon('budgets'),      activeIcon: mockActiveIcon('budgets') },
    { name: 'Reports',      path: '/reports',      icon: mockIcon('reports'),      activeIcon: mockActiveIcon('reports') },
  ],
  mobileNavRoutes: [
    { name: 'Dashboard',    path: '/dashboard',    icon: mockIcon('dashboard'),    activeIcon: mockActiveIcon('dashboard') },
    { name: 'Accounts',     path: '/accounts',     icon: mockIcon('accounts'),     activeIcon: mockActiveIcon('accounts') },
    { name: 'Transactions', path: '/transactions', icon: mockIcon('transactions'), activeIcon: mockActiveIcon('transactions') },
    { name: 'More',         path: '/more',         icon: mockIcon('more'),         activeIcon: mockActiveIcon('more') },
  ],
}));

vi.mock('@tabler/icons-react', () => ({
  IconChevronRight: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'chevron-right', ...props }),
}));

// ---------------------------------------------------------------------------
// Imports that depend on mocks
// ---------------------------------------------------------------------------
import { usePathname } from 'next/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

const EXPECTED_MORE_ROUTES = ['Cards', 'Expenses', 'Income', 'Transfers', 'Budgets', 'Reports'];
const ROUTES_EXCLUDED_FROM_MORE = ['Dashboard', 'Accounts', 'Transactions'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
  // Default pathname — not matching any moreRoute so nothing is active.
  vi.mocked(usePathname).mockReturnValue('/some-other-path');
});

describe('More page', () => {
  describe('static structure', () => {
    it('renders the "More" heading', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
      expect(screen.getByText('More')).toBeTruthy();
    });

    it('renders the subtitle paragraph', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByText('Browse more pages and features')).toBeTruthy();
    });
  });

  describe('route filtering — moreRoutes computation', () => {
    it('renders exactly 6 route items (those NOT in the mobile nav)', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      EXPECTED_MORE_ROUTES.forEach((name) => {
        expect(screen.getByText(name)).toBeTruthy();
      });
    });

    it('does NOT render routes that are already in the mobile nav bar', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      ROUTES_EXCLUDED_FROM_MORE.forEach((name) => {
        expect(screen.queryByText(name)).toBeNull();
      });
    });

    it('does NOT render a "More" entry in the list', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      // "More" is the page heading — confirm it only appears once (the h1)
      const allMore = screen.getAllByText('More');
      expect(allMore).toHaveLength(1);
    });
  });

  describe('link rendering', () => {
    it('renders a link for each moreRoute with the correct href', () => {
      const { container } = render(React.createElement(More), { wrapper: createWrapper() });
      const links = container.querySelectorAll('a');
      const hrefs = Array.from(links).map((a) => a.getAttribute('href'));

      expect(hrefs).toContain('/cards');
      expect(hrefs).toContain('/expenses');
      expect(hrefs).toContain('/income');
      expect(hrefs).toContain('/transfers');
      expect(hrefs).toContain('/budgets');
      expect(hrefs).toContain('/reports');
      expect(hrefs).toHaveLength(6);
    });

    it('renders a chevron icon for every route link', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      const chevrons = screen.getAllByTestId('chevron-right');
      expect(chevrons).toHaveLength(6);
    });
  });

  describe('inactive state (default — pathname does not match any moreRoute)', () => {
    it('renders the outline (non-active) icon for each route', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-cards')).toBeTruthy();
      expect(screen.getByTestId('icon-expenses')).toBeTruthy();
      expect(screen.getByTestId('icon-income')).toBeTruthy();
      expect(screen.getByTestId('icon-transfers')).toBeTruthy();
      expect(screen.getByTestId('icon-budgets')).toBeTruthy();
      expect(screen.getByTestId('icon-reports')).toBeTruthy();
    });

    it('does NOT render any active (filled) icons when no route matches', () => {
      render(React.createElement(More), { wrapper: createWrapper() });
      EXPECTED_MORE_ROUTES.forEach((name) => {
        const activeIconTestId = `active-icon-${name.toLowerCase()}`;
        expect(screen.queryByTestId(activeIconTestId)).toBeNull();
      });
    });

    it('applies the non-active text style to route name spans', () => {
      const { container } = render(React.createElement(More), { wrapper: createWrapper() });
      const spans = container.querySelectorAll('span.text-foreground');
      // All 6 route names should carry text-foreground when inactive
      expect(spans.length).toBe(6);
    });
  });

  describe('active state (pathname matches a moreRoute)', () => {
    it('renders the filled (active) icon for the active route', () => {
      vi.mocked(usePathname).mockReturnValue('/expenses');
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByTestId('active-icon-expenses')).toBeTruthy();
    });

    it('renders the outline icon for every inactive route when one is active', () => {
      vi.mocked(usePathname).mockReturnValue('/expenses');
      render(React.createElement(More), { wrapper: createWrapper() });
      const inactiveRoutes = EXPECTED_MORE_ROUTES.filter((n) => n !== 'Expenses');
      inactiveRoutes.forEach((name) => {
        expect(screen.getByTestId(`icon-${name.toLowerCase()}`)).toBeTruthy();
      });
    });

    it('applies bg-white/10 class to the active route link', () => {
      vi.mocked(usePathname).mockReturnValue('/expenses');
      const { container } = render(React.createElement(More), { wrapper: createWrapper() });
      const links = Array.from(container.querySelectorAll('a'));
      const activeLink = links.find((a) => a.getAttribute('href') === '/expenses');
      expect(activeLink).toBeTruthy();
      expect(activeLink!.className).toContain('bg-white/10');
    });

    it('applies active text styles (text-white font-medium) to the active route name', () => {
      vi.mocked(usePathname).mockReturnValue('/budgets');
      const { container } = render(React.createElement(More), { wrapper: createWrapper() });
      const activeSpan = container.querySelector('span.text-white.font-medium');
      expect(activeSpan).toBeTruthy();
      expect(activeSpan!.textContent).toBe('Budgets');
    });

    it('does NOT apply bg-white/10 to inactive route links', () => {
      vi.mocked(usePathname).mockReturnValue('/expenses');
      const { container } = render(React.createElement(More), { wrapper: createWrapper() });
      const links = Array.from(container.querySelectorAll('a'));
      const inactiveLinks = links.filter((a) => a.getAttribute('href') !== '/expenses');
      inactiveLinks.forEach((link) => {
        expect(link.className).not.toContain('bg-white/10');
      });
    });

    it('marks a route as active when pathname matches /cards', () => {
      vi.mocked(usePathname).mockReturnValue('/cards');
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByTestId('active-icon-cards')).toBeTruthy();
    });

    it('marks a route as active when pathname matches /reports', () => {
      vi.mocked(usePathname).mockReturnValue('/reports');
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getByTestId('active-icon-reports')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders correctly when pathname is /more (the page itself — no moreRoute is active)', () => {
      vi.mocked(usePathname).mockReturnValue('/more');
      render(React.createElement(More), { wrapper: createWrapper() });
      // All 6 routes shown, none active
      EXPECTED_MORE_ROUTES.forEach((name) => {
        expect(screen.getByText(name)).toBeTruthy();
      });
      EXPECTED_MORE_ROUTES.forEach((name) => {
        expect(screen.queryByTestId(`active-icon-${name.toLowerCase()}`)).toBeNull();
      });
    });

    it('renders correctly when pathname is an unrelated path', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');
      render(React.createElement(More), { wrapper: createWrapper() });
      expect(screen.getAllByTestId('chevron-right')).toHaveLength(6);
    });
  });
});
