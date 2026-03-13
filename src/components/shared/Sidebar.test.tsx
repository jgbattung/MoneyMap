import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the component
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth-client', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      session: { id: 'session-abc' },
    },
    isPending: false,
    error: null,
  })),
  signOut: vi.fn(),
}));

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: vi.fn(() => ({
    isCollapsed: false,
    toggleCollapsed: vi.fn(),
    isGroupExpanded: vi.fn(() => true),
    toggleGroup: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/app/constants/navigation', async () => {
  // Icon stubs must be defined inside the factory to avoid hoisting issues
  const { createElement } = await import('react');
  const stub = (testId: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return createElement('span', { 'data-testid': testId, ...props });
    };

  return {
    dashboardRoute: {
      name: 'Dashboard',
      path: '/dashboard',
      icon: stub('icon-dashboard'),
      activeIcon: stub('icon-dashboard-active'),
    },
    navGroups: [
      {
        label: 'Accounts',
        key: 'accounts',
        routes: [
          {
            name: 'Accounts',
            path: '/accounts',
            icon: stub('icon-accounts'),
            activeIcon: stub('icon-accounts-active'),
          },
        ],
      },
      {
        label: 'Activity',
        key: 'activity',
        routes: [
          {
            name: 'Transactions',
            path: '/transactions',
            icon: stub('icon-transactions'),
            activeIcon: stub('icon-transactions-active'),
          },
        ],
      },
    ],
  };
});

vi.mock('@tabler/icons-react', () => ({
  IconChevronDown: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'chevron-down', ...props }),
  IconChevronLeft: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'chevron-left', ...props }),
  IconChevronRight: (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': 'chevron-right', ...props }),
}));

// Tooltip — render children inline so interactions are testable
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'tooltip-content' }, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Form sheets — render null; we only care about the open prop side-effect
vi.mock('../forms/CreateIncomeTransactionSheet', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'income-sheet' }) : null,
}));

vi.mock('../forms/CreateTransferSheet', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'transfer-sheet' }) : null,
}));

vi.mock('../forms/CreateExpenseTransactionSheet', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'expense-sheet' }) : null,
}));

vi.mock('../icons', () => ({
  Icons: {
    addExpense: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-add-expense', ...props }),
    addIncome: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-add-income', ...props }),
    addTransfer: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-add-transfer', ...props }),
    logOut: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-logout', ...props }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import Sidebar from './Sidebar';
import { useSession, signOut } from '@/lib/auth-client';
import { useSidebarState } from '@/hooks/useSidebarState';
import { usePathname } from 'next/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const expandedState = {
  isCollapsed: false,
  toggleCollapsed: vi.fn(),
  isGroupExpanded: vi.fn(() => true),
  toggleGroup: vi.fn(),
};

const collapsedState = {
  isCollapsed: true,
  toggleCollapsed: vi.fn(),
  isGroupExpanded: vi.fn(() => true),
  toggleGroup: vi.fn(),
};

function renderSidebar() {
  return render(React.createElement(Sidebar));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();

  // Re-apply default mocks after resetAllMocks
  vi.mocked(useSession).mockReturnValue({
    data: {
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      session: { id: 'session-abc' },
    },
    isPending: false,
    error: null,
  } as ReturnType<typeof useSession>);

  vi.mocked(useSidebarState).mockReturnValue(expandedState);
  vi.mocked(usePathname).mockReturnValue('/dashboard');
});

describe('Sidebar', () => {
  // -------------------------------------------------------------------------
  describe('expanded mode — general rendering', () => {
    it('renders the MoneyMap logo text', () => {
      renderSidebar();
      expect(screen.getByText('Money')).toBeTruthy();
      expect(screen.getByText('Map')).toBeTruthy();
    });

    it('renders the Dashboard nav link', () => {
      renderSidebar();
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('renders nav group labels', () => {
      renderSidebar();
      // 'Accounts' appears as both the group header label AND the route link text
      // so we use getAllByText and confirm at least one match exists
      expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
      expect(screen.getByText('Activity')).toBeTruthy();
    });

    it('renders route links inside groups', () => {
      renderSidebar();
      expect(screen.getByText('Transactions')).toBeTruthy();
    });

    it('renders the Quick actions section label', () => {
      renderSidebar();
      expect(screen.getByText('Quick actions')).toBeTruthy();
    });

    it('renders quick action buttons with correct labels', () => {
      renderSidebar();
      expect(screen.getByText('Add expense')).toBeTruthy();
      expect(screen.getByText('Add income')).toBeTruthy();
      expect(screen.getByText('Add transfer')).toBeTruthy();
    });

    it('renders the collapse toggle button with aria-label "Collapse sidebar"', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy();
    });

    it('renders the logout button with aria-label "Log out"', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('user initial', () => {
    it('shows user initial from name (first char uppercase)', () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { id: 'u1', name: 'Alice', email: 'alice@test.com' }, session: { id: 's1' } },
        isPending: false,
        error: null,
      } as ReturnType<typeof useSession>);

      renderSidebar();
      // The user initial appears inside the avatar circle
      const avatars = screen.getAllByText('A');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('shows first char of email when name is absent', () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { id: 'u2', name: '', email: 'bob@test.com' }, session: { id: 's2' } },
        isPending: false,
        error: null,
      } as ReturnType<typeof useSession>);

      renderSidebar();
      const avatars = screen.getAllByText('B');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('falls back to "U" when session has no user data', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      } as ReturnType<typeof useSession>);

      renderSidebar();
      const avatars = screen.getAllByText('U');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('displays user name below the avatar in expanded mode', () => {
      renderSidebar();
      expect(screen.getByText('Test User')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('collapsed mode', () => {
    beforeEach(() => {
      vi.mocked(useSidebarState).mockReturnValue(collapsedState);
    });

    it('renders the "M" initial logo instead of full name', () => {
      renderSidebar();
      expect(screen.getByText('M')).toBeTruthy();
      expect(screen.queryByText('Money')).toBeNull();
    });

    it('renders the expand button with aria-label "Expand sidebar"', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
    });

    it('does not render "Quick actions" text label', () => {
      renderSidebar();
      expect(screen.queryByText('Quick actions')).toBeNull();
    });

    it('does not render "Main menu" text label', () => {
      renderSidebar();
      expect(screen.queryByText('Main menu')).toBeNull();
    });

    it('does not render nav group headers (Accounts / Activity) as buttons', () => {
      renderSidebar();
      // In collapsed mode the group buttons are not rendered
      const groupBtns = screen.queryAllByRole('button', { name: /Accounts|Activity/i });
      expect(groupBtns.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('toggle collapsed', () => {
    it('calls toggleCollapsed when toggle button is clicked in expanded mode', () => {
      const toggleCollapsed = vi.fn();
      vi.mocked(useSidebarState).mockReturnValue({ ...expandedState, toggleCollapsed });

      renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
      expect(toggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it('calls toggleCollapsed when toggle button is clicked in collapsed mode', () => {
      const toggleCollapsed = vi.fn();
      vi.mocked(useSidebarState).mockReturnValue({ ...collapsedState, toggleCollapsed });

      renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
      expect(toggleCollapsed).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('nav group toggle', () => {
    it('calls toggleGroup with the correct key when group header is clicked', () => {
      const toggleGroup = vi.fn();
      vi.mocked(useSidebarState).mockReturnValue({ ...expandedState, toggleGroup });

      renderSidebar();

      // Find a group header button — they are uppercase text buttons
      const accountsBtn = screen.getByRole('button', { name: /accounts/i });
      fireEvent.click(accountsBtn);
      expect(toggleGroup).toHaveBeenCalledWith('accounts');
    });

    it('sets aria-expanded true on group header when group is expanded', () => {
      vi.mocked(useSidebarState).mockReturnValue({
        ...expandedState,
        isGroupExpanded: vi.fn(() => true),
      });

      renderSidebar();
      const accountsBtn = screen.getByRole('button', { name: /accounts/i });
      expect(accountsBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('sets aria-expanded false on group header when group is collapsed', () => {
      vi.mocked(useSidebarState).mockReturnValue({
        ...expandedState,
        isGroupExpanded: vi.fn(() => false),
      });

      renderSidebar();
      const accountsBtn = screen.getByRole('button', { name: /accounts/i });
      expect(accountsBtn.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // -------------------------------------------------------------------------
  describe('active route state', () => {
    it('marks Dashboard link as active when pathname is /dashboard', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      renderSidebar();

      // The active link has bg-white/15 in its class. We check via the link text.
      const dashLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashLink.className).toContain('bg-white/15');
    });

    it('marks an inner route as active when pathname matches its path', () => {
      vi.mocked(usePathname).mockReturnValue('/transactions');
      vi.mocked(useSidebarState).mockReturnValue({
        ...expandedState,
        isGroupExpanded: vi.fn(() => true),
      });

      renderSidebar();
      const txLink = screen.getByRole('link', { name: /transactions/i });
      expect(txLink.className).toContain('bg-white/15');
    });
  });

  // -------------------------------------------------------------------------
  describe('quick action sheets', () => {
    it('opens income sheet when "Add income" is clicked', () => {
      renderSidebar();
      expect(screen.queryByTestId('income-sheet')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Add income' }));
      expect(screen.getByTestId('income-sheet')).toBeTruthy();
    });

    it('opens expense sheet when "Add expense" is clicked', () => {
      renderSidebar();
      expect(screen.queryByTestId('expense-sheet')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
      expect(screen.getByTestId('expense-sheet')).toBeTruthy();
    });

    it('opens transfer sheet when "Add transfer" is clicked', () => {
      renderSidebar();
      expect(screen.queryByTestId('transfer-sheet')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Add transfer' }));
      expect(screen.getByTestId('transfer-sheet')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('calls signOut when the logout button is clicked', () => {
      renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
      expect(vi.mocked(signOut)).toHaveBeenCalledTimes(1);
    });

    it('passes fetchOptions with onSuccess callback to signOut', () => {
      renderSidebar();
      fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

      const callArg = vi.mocked(signOut).mock.calls[0][0] as {
        fetchOptions: { onSuccess: () => void };
      };
      expect(typeof callArg.fetchOptions.onSuccess).toBe('function');
    });
  });
});
