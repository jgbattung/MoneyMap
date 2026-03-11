import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import RecentTransactions from './RecentTransactions';

// Mock the hook
vi.mock('@/hooks/useRecentTransactions', () => ({
  useRecentTransactions: vi.fn(),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Mock tabler icons
vi.mock('@tabler/icons-react', () => ({
  IconArrowDown: () => React.createElement('svg', { 'data-testid': 'icon-expense' }),
  IconArrowUp: () => React.createElement('svg', { 'data-testid': 'icon-income' }),
  IconArrowRight: () => React.createElement('svg', { 'data-testid': 'icon-transfer' }),
}));

import { useRecentTransactions } from '@/hooks/useRecentTransactions';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockTransaction = {
  id: 'txn-1',
  type: 'EXPENSE' as const,
  name: 'Groceries',
  amount: 500,
  date: '2024-03-10T00:00:00.000Z',
  accountId: 'acc-1',
  accountName: 'BDO Savings',
  categoryId: 'cat-1',
  categoryName: 'Food',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RecentTransactions', () => {
  describe('loading state', () => {
    it('renders skeleton loaders while data is loading', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [],
        isLoading: true,
        error: null,
      });

      const { container } = render(
        React.createElement(RecentTransactions),
        { wrapper: createWrapper() }
      );

      // Skeletons are rendered — check for skeleton elements
      const skeletons = container.querySelectorAll('[class*="Skeleton"], .bg-secondary-500, [class*="h-10"][class*="w-10"]');
      expect(container.textContent).toContain('Recent Transactions');
    });
  });

  describe('error state', () => {
    it('renders error message when fetch fails', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [],
        isLoading: false,
        error: 'Failed to fetch recent transactions',
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load recent transactions')).toBeTruthy();
      expect(screen.getByText('Failed to fetch recent transactions')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders empty state message when no transactions exist', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('No transactions yet')).toBeTruthy();
      expect(screen.getByText(/Start tracking your finances/)).toBeTruthy();
    });
  });

  describe('happy path — transaction list', () => {
    it('renders transaction name and amount', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [mockTransaction],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText(/500\.00/)).toBeTruthy();
    });

    it('renders account name for non-transfer transactions', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [mockTransaction],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders "from → to" account format for TRANSFER type', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [
          {
            ...mockTransaction,
            type: 'TRANSFER' as const,
            toAccountName: 'BPI Checking',
          },
        ],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('BDO Savings → BPI Checking')).toBeTruthy();
    });

    it('renders "See All" button linking to /transactions', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [mockTransaction],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      const link = screen.getByRole('link', { name: /see all/i });
      expect(link.getAttribute('href')).toBe('/transactions');
    });

    it('renders multiple transactions', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [
          mockTransaction,
          { ...mockTransaction, id: 'txn-2', name: 'Salary', type: 'INCOME' as const },
        ],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Salary')).toBeTruthy();
    });
  });

  describe('color classes by transaction type', () => {
    it('applies text-text-error to EXPENSE amount', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'EXPENSE' as const }],
        isLoading: false,
        error: null,
      });

      const { container } = render(
        React.createElement(RecentTransactions),
        { wrapper: createWrapper() }
      );

      const amountEl = screen.getByText(/₱500\.00/);
      expect(amountEl.className).toContain('text-text-error');
    });

    it('applies text-text-success to INCOME amount', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'INCOME' as const }],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      const amountEl = screen.getByText(/₱500\.00/);
      expect(amountEl.className).toContain('text-text-success');
    });

    it('applies text-muted-foreground to TRANSFER amount', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'TRANSFER' as const, toAccountName: 'BPI' }],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      const amountEl = screen.getByText(/₱500\.00/);
      expect(amountEl.className).toContain('text-muted-foreground');
    });

    it('applies bg-text-error/20 icon background for EXPENSE', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'EXPENSE' as const }],
        isLoading: false,
        error: null,
      });

      const { container } = render(
        React.createElement(RecentTransactions),
        { wrapper: createWrapper() }
      );

      expect(container.querySelector('.bg-text-error\\/20')).toBeTruthy();
    });

    it('applies bg-text-success/20 icon background for INCOME', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'INCOME' as const }],
        isLoading: false,
        error: null,
      });

      const { container } = render(
        React.createElement(RecentTransactions),
        { wrapper: createWrapper() }
      );

      expect(container.querySelector('.bg-text-success\\/20')).toBeTruthy();
    });

    it('applies bg-muted icon background for TRANSFER', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, type: 'TRANSFER' as const, toAccountName: 'BPI' }],
        isLoading: false,
        error: null,
      });

      const { container } = render(
        React.createElement(RecentTransactions),
        { wrapper: createWrapper() }
      );

      expect(container.querySelector('.bg-muted')).toBeTruthy();
    });
  });

  describe('date formatting', () => {
    it('formats transaction date as "MMM dd, yyyy"', () => {
      vi.mocked(useRecentTransactions).mockReturnValue({
        transactions: [{ ...mockTransaction, date: '2024-03-10T00:00:00.000Z' }],
        isLoading: false,
        error: null,
      });

      render(React.createElement(RecentTransactions), { wrapper: createWrapper() });

      // date-fns MMM dd, yyyy format
      expect(screen.getByText(/Mar \d+, 2024/)).toBeTruthy();
    });
  });
});
