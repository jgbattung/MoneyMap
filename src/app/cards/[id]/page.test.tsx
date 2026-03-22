import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'card-abc' })),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock('@/hooks/useCardsQuery', () => ({
  useCardQuery: vi.fn(),
}));

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
    creditCardIcon: (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': 'icon-credit-card', ...props }),
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}));

// ---------------------------------------------------------------------------
// Imports that depend on mocks
// ---------------------------------------------------------------------------
import { useParams } from 'next/navigation';
import { useCardQuery } from '@/hooks/useCardsQuery';
import CardDetailPage from './page';

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

const mockCardData = {
  id: 'card-abc',
  name: 'My Visa Card',
  accountType: 'CREDIT_CARD' as const,
  currentBalance: '-2500.75',
  initialBalance: '0',
  addToNetWorth: false,
  statementDate: 15,
  dueDate: 5,
  cardGroup: null,
  statementBalance: '-1200.00',
  lastStatementCalculationDate: '2026-03-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useParams).mockReturnValue({ id: 'card-abc' });
});

describe('CardDetailPage', () => {
  describe('loading state', () => {
    it('renders skeleton pulse elements while fetching', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: true,
        error: null,
      });

      const { container } = render(React.createElement(CardDetailPage), {
        wrapper: createWrapper(),
      });
      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('does not render card name during loading', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: true,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.queryByText('My Visa Card')).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders the error heading when query returns an error', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: 'Failed to fetch card',
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Failed to load card')).toBeTruthy();
    });

    it('renders the specific error message text', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: 'Network timeout',
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Network timeout')).toBeTruthy();
    });

    it('renders a "Try again" button in the error state', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: 'Some error',
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });

    it('renders the error icon in the error state', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: 'Some error',
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-error')).toBeTruthy();
    });
  });

  describe('empty state — card not found', () => {
    it('renders "Card not found" when cardData is null and no error', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Card not found')).toBeTruthy();
    });

    it('renders "Back to Cards" button in the not-found state', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: undefined,
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /back to cards/i })).toBeTruthy();
    });
  });

  describe('success state — happy path', () => {
    beforeEach(() => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: mockCardData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the card name', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('My Visa Card').length).toBeGreaterThan(0);
    });

    it('renders the formatted outstanding balance', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      // |−2500.75| = 2,500.75
      expect(screen.getAllByText(/2,500\.75/).length).toBeGreaterThan(0);
    });

    it('renders the PHP currency label', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('PHP').length).toBeGreaterThan(0);
    });

    it('renders "Credit Card" label', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getAllByText('Credit Card').length).toBeGreaterThan(0);
    });

    it('renders the Statement Overview section', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Statement Overview')).toBeTruthy();
    });

    it('renders statement balance when available', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText(/1,200\.00/)).toBeTruthy();
    });

    it('renders the statement date with ordinal suffix', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      // statementDate = 15 → "15th of each month"
      expect(screen.getByText(/15th of each month/)).toBeTruthy();
    });

    it('renders "Statement balance will be available" when statementBalance is null', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: { ...mockCardData, statementBalance: null },
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(
        screen.getByText(/statement balance will be available after the next statement date/i)
      ).toBeTruthy();
    });
  });

  describe('mobile back link', () => {
    beforeEach(() => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: mockCardData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the back link pointing to /cards', () => {
      const { container } = render(React.createElement(CardDetailPage), {
        wrapper: createWrapper(),
      });
      const links = Array.from(container.querySelectorAll('a'));
      const backLink = links.find((a) => a.getAttribute('href') === '/cards');
      expect(backLink).toBeTruthy();
    });

    it('renders "Cards" text inside the back link', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText('Cards')).toBeTruthy();
    });

    it('back link is inside the mobile-only container (md:hidden)', () => {
      const { container } = render(React.createElement(CardDetailPage), {
        wrapper: createWrapper(),
      });
      const backLink = container.querySelector('a[href="/cards"]');
      expect(backLink).toBeTruthy();
      const mobileContainer = backLink!.closest('.flex.md\\:hidden');
      expect(mobileContainer).toBeTruthy();
    });
  });

  describe('table components', () => {
    beforeEach(() => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: mockCardData,
        isFetching: false,
        error: null,
      });
    });

    it('renders the ExpenseTable component', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('expense-table')).toBeTruthy();
    });

    it('renders the IncomeTable component', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('income-table')).toBeTruthy();
    });

    it('renders the TransferTable component', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('transfer-table')).toBeTruthy();
    });

    it('renders the TransactionsMobileView component', () => {
      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByTestId('transactions-mobile-view')).toBeTruthy();
    });
  });

  describe('ordinal suffix logic', () => {
    it('uses "st" suffix for day 1', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: { ...mockCardData, statementDate: 1 },
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText(/1st of each month/)).toBeTruthy();
    });

    it('uses "nd" suffix for day 2', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: { ...mockCardData, statementDate: 2 },
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText(/2nd of each month/)).toBeTruthy();
    });

    it('uses "rd" suffix for day 3', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: { ...mockCardData, statementDate: 3 },
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText(/3rd of each month/)).toBeTruthy();
    });

    it('uses "th" suffix for day 11 (special case)', () => {
      vi.mocked(useCardQuery).mockReturnValue({
        cardData: { ...mockCardData, statementDate: 11 },
        isFetching: false,
        error: null,
      });

      render(React.createElement(CardDetailPage), { wrapper: createWrapper() });
      expect(screen.getByText(/11th of each month/)).toBeTruthy();
    });
  });
});
