import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AccountsSummary } from './AccountsSummary';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/hooks/useCardsQuery', () => ({
  useCardsQuery: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatCurrency: (amount: number) =>
    amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}));

// Mock framer-motion — return no-op stubs so animations don't interfere.
// useReducedMotion returns true so initial animation is disabled.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
  },
  useReducedMotion: () => true,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...rest }, children),
}));

// Mock Skeleton to a simple div
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// Mock Button (Shadcn) — render as a plain button/anchor depending on asChild usage
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, className }: { children: React.ReactNode; asChild?: boolean; className?: string }) => {
    if (asChild) {
      // When asChild is true, Button renders its child directly; just render children
      return React.createElement(React.Fragment, null, children);
    }
    return React.createElement('button', { className }, children);
  },
}));

// Mock lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('svg', { 'data-testid': 'icon-alert-circle' }),
  Wallet: () => React.createElement('svg', { 'data-testid': 'icon-wallet' }),
  CreditCard: () => React.createElement('svg', { 'data-testid': 'icon-credit-card' }),
  Landmark: () => React.createElement('svg', { 'data-testid': 'icon-landmark' }),
  PiggyBank: () => React.createElement('svg', { 'data-testid': 'icon-piggy-bank' }),
  TrendingUp: () => React.createElement('svg', { 'data-testid': 'icon-trending-up' }),
  Banknote: () => React.createElement('svg', { 'data-testid': 'icon-banknote' }),
  Bitcoin: () => React.createElement('svg', { 'data-testid': 'icon-bitcoin' }),
  Clock: () => React.createElement('svg', { 'data-testid': 'icon-clock' }),
  Home: () => React.createElement('svg', { 'data-testid': 'icon-home' }),
  Briefcase: () => React.createElement('svg', { 'data-testid': 'icon-briefcase' }),
  Smartphone: () => React.createElement('svg', { 'data-testid': 'icon-smartphone' }),
}));

import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';

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

const makeDefaultAccountsReturn = (overrides = {}) => ({
  accounts: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  ...overrides,
});

const makeDefaultCardsReturn = (overrides = {}) => ({
  cards: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  ...overrides,
});

const mockAccount = (overrides = {}) => ({
  id: 'acc-1',
  name: 'BDO Savings',
  accountType: 'SAVINGS' as const,
  currentBalance: '50000',
  initialBalance: '50000',
  addToNetWorth: true,
  ...overrides,
});

const mockCard = (overrides = {}) => ({
  id: 'card-1',
  name: 'Visa Gold',
  accountType: 'CREDIT_CARD' as const,
  currentBalance: '-15000',
  initialBalance: '-15000',
  addToNetWorth: true,
  statementDate: 15,
  dueDate: 10,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  // Set safe defaults so every test starts clean
  vi.mocked(useAccountsQuery).mockReturnValue(makeDefaultAccountsReturn());
  vi.mocked(useCardsQuery).mockReturnValue(makeDefaultCardsReturn());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountsSummary', () => {

  // -------------------------------------------------------------------------
  describe('TopAccounts — loading state', () => {
    it('renders skeleton items while accounts are loading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ isLoading: true })
      );

      const { container } = render(
        React.createElement(AccountsSummary),
        { wrapper: createWrapper() }
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render "Accounts" heading while loading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ isLoading: true })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.queryByText('Accounts')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('TopAccounts — error state', () => {
    it('renders the AlertCircle icon when accounts fail to load', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-alert-circle')).toBeTruthy();
    });

    it('renders "Failed to load accounts" heading in the error state', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load accounts')).toBeTruthy();
    });

    it('renders the error message text from the hook', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ error: 'Network timeout' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Network timeout')).toBeTruthy();
    });

    it('renders a "Try again" button in the accounts error state', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const tryAgainButtons = screen.getAllByText('Try again');
      expect(tryAgainButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls refetch when accounts "Try again" is clicked', () => {
      const refetch = vi.fn();
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ error: 'Failed to fetch accounts', refetch })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      // Click the first "Try again" (accounts panel)
      fireEvent.click(screen.getAllByText('Try again')[0]);
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('TopAccounts — empty state', () => {
    it('renders "No accounts yet" when accounts list is empty', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('No accounts yet')).toBeTruthy();
    });

    it('renders contextual helper text for empty accounts', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Add an account to start tracking')).toBeTruthy();
    });

    it('renders a Wallet icon in the accounts empty state', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      // Wallet icon is used for the accounts empty state
      const walletIcons = screen.getAllByTestId('icon-wallet');
      expect(walletIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('TopAccounts — happy path', () => {
    it('renders account names', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders formatted balance with peso sign', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount({ currentBalance: '50000' })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText(/₱50,000\.00/)).toBeTruthy();
    });

    it('renders the account type label for SAVINGS', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount({ accountType: 'SAVINGS' })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Savings')).toBeTruthy();
    });

    it('renders the account type label for CHECKING', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({
          accounts: [mockAccount({ accountType: 'CHECKING', name: 'BPI Checking' })],
        })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Checking')).toBeTruthy();
    });

    it('renders a link to the account detail page', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount({ id: 'acc-abc' })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const link = screen.getByRole('link', { name: /BDO Savings/i });
      expect(link.getAttribute('href')).toBe('/accounts/acc-abc');
    });

    it('renders the "See All Accounts" button linking to /accounts', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const link = screen.getByRole('link', { name: 'See All Accounts' });
      expect(link.getAttribute('href')).toBe('/accounts');
    });

    it('renders "Accounts" section heading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Accounts')).toBeTruthy();
    });

    it('limits displayed accounts to 5 entries', () => {
      const sixAccounts = Array.from({ length: 6 }, (_, i) =>
        mockAccount({ id: `acc-${i}`, name: `Account ${i}`, currentBalance: `${(i + 1) * 1000}` })
      );
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: sixAccounts })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      // 5 account item links (excludes "See All Accounts" link)
      const accountLinks = screen
        .getAllByRole('link')
        .filter((el) => el.getAttribute('href')?.startsWith('/accounts/'));
      expect(accountLinks).toHaveLength(5);
    });

    it('sorts accounts by balance descending and shows highest first', () => {
      const accounts = [
        mockAccount({ id: 'acc-low', name: 'Low Balance', currentBalance: '1000' }),
        mockAccount({ id: 'acc-high', name: 'High Balance', currentBalance: '99000' }),
      ];
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const accountLinks = screen
        .getAllByRole('link')
        .filter((el) => el.getAttribute('href')?.startsWith('/accounts/'));
      expect(accountLinks[0].getAttribute('href')).toBe('/accounts/acc-high');
      expect(accountLinks[1].getAttribute('href')).toBe('/accounts/acc-low');
    });
  });

  // -------------------------------------------------------------------------
  describe('TopAccounts — account type icons', () => {
    it.each([
      ['SAVINGS', 'icon-piggy-bank'],
      ['CHECKING', 'icon-landmark'],
      ['INVESTMENT', 'icon-trending-up'],
      ['CASH', 'icon-banknote'],
      ['CRYPTO', 'icon-bitcoin'],
      ['RETIREMENT', 'icon-clock'],
      ['REAL_ESTATE', 'icon-home'],
      ['PAYROLL', 'icon-briefcase'],
      ['E_WALLET', 'icon-smartphone'],
      ['OTHER', 'icon-wallet'],
    ])('renders correct icon for account type %s', (accountType, testId) => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultAccountsReturn({ accounts: [mockAccount({ accountType })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByTestId(testId)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('TopCreditCards — loading state', () => {
    it('renders skeleton items while cards are loading', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ isLoading: true })
      );

      const { container } = render(
        React.createElement(AccountsSummary),
        { wrapper: createWrapper() }
      );

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render "Credit Cards" heading while loading', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ isLoading: true })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.queryByText('Credit Cards')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('TopCreditCards — error state', () => {
    it('renders "Failed to load credit cards" heading when cards fail to load', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ error: 'Failed to fetch cards' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load credit cards')).toBeTruthy();
    });

    it('renders the error message text from the cards hook', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ error: 'Server unavailable' })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Server unavailable')).toBeTruthy();
    });

    it('calls cards refetch when cards "Try again" is clicked', () => {
      const cardsRefetch = vi.fn();
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ error: 'Failed to fetch cards', refetch: cardsRefetch })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      // The cards panel "Try again" — accounts panel is showing empty state so only 1 "Try again"
      fireEvent.click(screen.getByText('Try again'));
      expect(cardsRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('TopCreditCards — empty state', () => {
    it('renders "No credit cards yet" when cards list is empty', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('No credit cards yet')).toBeTruthy();
    });

    it('renders contextual helper text for empty cards', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Add a credit card to track debt')).toBeTruthy();
    });

    it('renders a CreditCard icon in the cards empty state', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-credit-card')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('TopCreditCards — happy path', () => {
    it('renders card name', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Visa Gold')).toBeTruthy();
    });

    it('renders "Credit Card" label under card name', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Credit Card')).toBeTruthy();
    });

    it('renders display balance as positive (negated from stored negative value)', () => {
      // Stored: -15000 → display: +15000
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard({ currentBalance: '-15000' })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText(/₱15,000\.00/)).toBeTruthy();
    });

    it('renders a link to the card detail page', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard({ id: 'card-xyz' })] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const link = screen.getByRole('link', { name: /Visa Gold/i });
      expect(link.getAttribute('href')).toBe('/cards/card-xyz');
    });

    it('renders the "See All Cards" button linking to /cards', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const link = screen.getByRole('link', { name: 'See All Cards' });
      expect(link.getAttribute('href')).toBe('/cards');
    });

    it('renders "Credit Cards" section heading', () => {
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: [mockCard()] })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('Credit Cards')).toBeTruthy();
    });

    it('limits displayed cards to 5 entries', () => {
      const sixCards = Array.from({ length: 6 }, (_, i) =>
        mockCard({ id: `card-${i}`, name: `Card ${i}`, currentBalance: `${-(i + 1) * 1000}` })
      );
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards: sixCards })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const cardLinks = screen
        .getAllByRole('link')
        .filter((el) => el.getAttribute('href')?.startsWith('/cards/'));
      expect(cardLinks).toHaveLength(5);
    });

    it('sorts cards by absolute balance descending (highest debt first)', () => {
      const cards = [
        mockCard({ id: 'card-low', name: 'Low Debt', currentBalance: '-1000' }),
        mockCard({ id: 'card-high', name: 'High Debt', currentBalance: '-50000' }),
      ];
      vi.mocked(useCardsQuery).mockReturnValue(
        makeDefaultCardsReturn({ cards })
      );

      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      const cardLinks = screen
        .getAllByRole('link')
        .filter((el) => el.getAttribute('href')?.startsWith('/cards/'));
      expect(cardLinks[0].getAttribute('href')).toBe('/cards/card-high');
      expect(cardLinks[1].getAttribute('href')).toBe('/cards/card-low');
    });
  });

  // -------------------------------------------------------------------------
  describe('grid layout', () => {
    it('renders both the accounts panel and the credit cards panel', () => {
      render(React.createElement(AccountsSummary), { wrapper: createWrapper() });

      expect(screen.getByText('No accounts yet')).toBeTruthy();
      expect(screen.getByText('No credit cards yet')).toBeTruthy();
    });
  });
});
