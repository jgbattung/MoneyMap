import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ id: 'account-123' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountQuery: vi.fn(),
}));

// Mock heavy child components to isolate the page logic
vi.mock('@/components/tables/expenses/ExpenseTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'expense-table' }),
}));

vi.mock('@/components/tables/income/IncomeTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'income-table' }),
}));

vi.mock('@/components/tables/transfers/TransferTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'transfer-table' }),
}));

vi.mock('@/components/transactions/TransactionsMobileView', () => ({
  default: () => React.createElement('div', { 'data-testid': 'transactions-mobile-view' }),
}));

vi.mock('@/components/icons', () => ({
  Icons: {
    error: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-error', ...props }),
    bank: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-bank', ...props }),
    addToNetWorth: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-add-to-net-worth', ...props }),
  },
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'skeleton', ...props }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}));

// ---------------------------------------------------------------------------
// Imports that depend on mocks
// ---------------------------------------------------------------------------
import { useParams } from 'next/navigation';
import { useAccountQuery } from '@/hooks/useAccountsQuery';
import AccountDetailPage from './page';

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

const mockAccountData = {
  id: 'account-123',
  name: 'My Savings Account',
  accountType: 'SAVINGS',
  currentBalance: '15000.00',
  initialBalance: '10000.00',
  addToNetWorth: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useParams).mockReturnValue({ id: 'account-123' });
});

describe('AccountDetailPage', () => {
  describe('loading state', () => {
    it('renders skeleton elements while fetching', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: true,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render account name during loading', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: true,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.queryByText('My Savings Account')).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error message when query returns an error', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: false,
        error: 'Network error',
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Failed to load account')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('renders "Account not found" fallback when error is null and data is missing', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: false,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Failed to load account')).toBeTruthy();
      expect(screen.getByText('Account not found')).toBeTruthy();
    });

    it('renders the error icon in the error state', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: false,
        error: 'Some error',
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-error')).toBeTruthy();
    });

    it('renders a "Try again" button in the error state', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: undefined,
        isFetching: false,
        error: 'Some error',
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });
  });

  describe('success state — happy path', () => {
    beforeEach(() => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: mockAccountData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the account name', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('My Savings Account').length).toBeGreaterThan(0);
    });

    it('renders the formatted account type', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('Savings').length).toBeGreaterThan(0);
    });

    it('renders the formatted balance', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText(/15,000\.00/).length).toBeGreaterThan(0);
    });

    it('renders the PHP currency label', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('PHP').length).toBeGreaterThan(0);
    });

    it('renders the bank icon in the header', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByTestId('icon-bank').length).toBeGreaterThan(0);
    });

    it('renders the addToNetWorth icon when flag is true', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByTestId('icon-add-to-net-worth').length).toBeGreaterThan(0);
    });

    it('does NOT render the addToNetWorth icon when flag is false', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: { ...mockAccountData, addToNetWorth: false },
        isFetching: false,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.queryByTestId('icon-add-to-net-worth')).toBeNull();
    });
  });

  describe('mobile back link', () => {
    beforeEach(() => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: mockAccountData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the back link pointing to /accounts', () => {
      const { container } = render(React.createElement(AccountDetailPage), {
        wrapper: createWrapper(),
      });
      const links = Array.from(container.querySelectorAll('a'));
      const backLink = links.find((a) => a.getAttribute('href') === '/accounts');
      expect(backLink).toBeTruthy();
    });

    it('renders "Accounts" text inside the back link', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Accounts')).toBeTruthy();
    });

    it('back link is inside the mobile-only flex container (md:hidden)', () => {
      const { container } = render(React.createElement(AccountDetailPage), {
        wrapper: createWrapper(),
      });
      const backLink = container.querySelector('a[href="/accounts"]');
      expect(backLink).toBeTruthy();
      // The back link's parent should be the mobile-only (md:hidden) container
      const mobileContainer = backLink!.closest('.flex.md\\:hidden');
      expect(mobileContainer).toBeTruthy();
    });
  });

  describe('account type formatting', () => {
    it('formats CHECKING account type correctly', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: { ...mockAccountData, accountType: 'CHECKING' },
        isFetching: false,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('Checking').length).toBeGreaterThan(0);
    });

    it('formats E_WALLET account type as "E Wallet"', () => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: { ...mockAccountData, accountType: 'E_WALLET' },
        isFetching: false,
        error: null,
      });

      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('E Wallet').length).toBeGreaterThan(0);
    });
  });

  describe('table components', () => {
    beforeEach(() => {
      vi.mocked(useAccountQuery).mockReturnValue({
        data: mockAccountData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the ExpenseTable component', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('expense-table')).toBeTruthy();
    });

    it('renders the IncomeTable component', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('income-table')).toBeTruthy();
    });

    it('renders the TransferTable component', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('transfer-table')).toBeTruthy();
    });

    it('renders the TransactionsMobileView component', () => {
      render(React.createElement(AccountDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('transactions-mobile-view')).toBeTruthy();
    });
  });
});
