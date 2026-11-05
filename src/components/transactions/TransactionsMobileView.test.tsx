/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsMobileView from './TransactionsMobileView';

// ---------------------------------------------------------------------------
// Mock: better-auth/react
// ---------------------------------------------------------------------------
vi.mock('better-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      session: { id: 'session-abc' },
    },
    isPending: false,
    error: null,
  })),
}));

// ---------------------------------------------------------------------------
// Mock: data hooks
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useExpenseTransactionsQuery', () => ({
  useExpenseTransactionsQuery: vi.fn(),
}));

vi.mock('@/hooks/useIncomeTransactionsQuery', () => ({
  useIncomeTransactionsQuery: vi.fn(),
}));

vi.mock('@/hooks/useTransferTransactionsQuery', () => ({
  useTransfersQuery: vi.fn(),
}));

vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

// Option lists for the filter sheet come from real query hooks in production.
vi.mock('@/hooks/useTransactionFilterOptions', () => {
  const options = {
    accounts: [{ id: 'acc-1', name: 'BDO Savings' }],
    categories: [{ id: 'type-1', name: 'Food' }],
    tags: [{ id: 'tag-1', name: 'Housing' }],
  };
  return {
    useExpenseFilterOptions: () => options,
    useIncomeFilterOptions: () => options,
    useTransferFilterOptions: () => options,
  };
});

// ---------------------------------------------------------------------------
// Mock: drawers — render nothing (portal-heavy)
// ---------------------------------------------------------------------------
vi.mock('@/components/forms/EditExpenseDrawer', () => ({
  default: () => null,
}));

vi.mock('@/components/forms/EditIncomeDrawer', () => ({
  default: () => null,
}));

vi.mock('@/components/forms/EditTransferDrawer', () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Mock: CompactTransactionCard — renders a simple div with the name
// ---------------------------------------------------------------------------
vi.mock('./CompactTransactionCard', () => ({
  default: ({
    name,
    onClick,
  }: {
    name: string;
    onClick?: () => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'transaction-card', onClick },
      name
    ),
}));

// ---------------------------------------------------------------------------
// Mock: UI primitives
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/toggle-group', () => {
  const Ctx = React.createContext<((v: string) => void) | undefined>(undefined);
  return {
    ToggleGroup: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
      value?: string;
      disabled?: boolean;
    }) =>
      React.createElement(
        Ctx.Provider,
        { value: onValueChange },
        React.createElement(
          'div',
          { 'data-testid': 'toggle-group', 'data-value': value },
          children
        )
      ),
    ToggleGroupItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => {
      const onValueChange = React.useContext(Ctx);
      return React.createElement(
        'button',
        { 'data-testid': `tab-${value}`, onClick: () => onValueChange?.(value) },
        children
      );
    },
  };
});

vi.mock('@/components/ui/input-group', () => ({
  InputGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  InputGroupInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', { ...props, 'data-testid': 'search-input' }),
  InputGroupAddon: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import type { ExpenseTransaction } from '@/hooks/useExpenseTransactionsQuery';
import type { IncomeTransaction } from '@/hooks/useIncomeTransactionsQuery';
import type { TransferTransaction } from '@/hooks/useTransferTransactionsQuery';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------
const makeExpense = (id: string, name: string): ExpenseTransaction => ({
  id,
  userId: 'user-123',
  accountId: 'acc-1',
  expenseTypeId: 'type-1',
  expenseSubcategoryId: null,
  name,
  amount: '100.00',
  date: '2026-01-15',
  description: null,
  isInstallment: false,
  installmentDuration: null,
  remainingInstallments: null,
  installmentStartDate: null,
  monthlyAmount: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  expenseType: { id: 'type-1', name: 'Food' },
  expenseSubcategory: null,
  tags: [],
});

const makeIncome = (id: string, name: string): IncomeTransaction => ({
  id,
  userId: 'user-123',
  accountId: 'acc-1',
  incomeTypeId: 'itype-1',
  name,
  amount: '5000.00',
  date: '2026-01-15',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  incomeType: { id: 'itype-1', name: 'Salary' },
  tags: [],
});

const makeTransfer = (id: string, name: string): TransferTransaction => ({
  id,
  userId: 'user-123',
  name,
  amount: 1000,
  fromAccountId: 'acc-1',
  toAccountId: 'acc-2',
  transferTypeId: 'ttype-1',
  date: '2026-01-15',
  notes: null,
  feeAmount: null,
  feeExpenseId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  fromAccount: { id: 'acc-1', name: 'BDO Savings', currentBalance: 50000 },
  toAccount: { id: 'acc-2', name: 'BPI Checking', currentBalance: 20000 },
  transferType: { id: 'ttype-1', name: 'Bank Transfer' },
  tags: [],
});

const mockExpenses = [
  makeExpense('exp-1', 'Groceries'),
  makeExpense('exp-2', 'Netflix'),
];

const mockIncome = [
  makeIncome('inc-1', 'January Salary'),
  makeIncome('inc-2', 'Freelance'),
];

const mockTransfers = [
  makeTransfer('txf-1', 'Savings Transfer'),
  makeTransfer('txf-2', 'Rent Payment'),
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------
function setupAllMocks(overrides: {
  expensesLoading?: boolean;
  incomeLoading?: boolean;
  transfersLoading?: boolean;
  expenses?: ExpenseTransaction[];
  income?: IncomeTransaction[];
  transfers?: TransferTransaction[];
  hasMore?: boolean;
} = {}) {
  const {
    expensesLoading = false,
    incomeLoading = false,
    transfersLoading = false,
    expenses = mockExpenses,
    income = mockIncome,
    transfers = mockTransfers,
    hasMore = false,
  } = overrides;

  vi.mocked(useExpenseTransactionsQuery).mockReturnValue({
    expenseTransactions: expenses,
    total: expenses.length,
    totalAmount: '200.00',
    hasMore,
    isLoading: expensesLoading,
    isFetchingMore: false,
    error: null,
    createExpenseTransaction: vi.fn(),
    updateExpenseTransaction: vi.fn(),
    deleteExpenseTransaction: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useIncomeTransactionsQuery).mockReturnValue({
    incomeTransactions: income,
    total: income.length,
    totalAmount: '10000.00',
    hasMore,
    isLoading: incomeLoading,
    isFetchingMore: false,
    error: null,
    createIncomeTransaction: vi.fn(),
    updateIncomeTransaction: vi.fn(),
    deleteIncomeTransaction: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useTransfersQuery).mockReturnValue({
    transfers,
    total: transfers.length,
    hasMore,
    isLoading: transfersLoading,
    isFetchingMore: false,
    error: null,
    createTransfer: vi.fn(),
    updateTransfer: vi.fn(),
    deleteTransfer: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useTagsQuery).mockReturnValue({
    tags: [
      { id: 'tag-1', name: 'Housing', color: '#FF6B6B', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ],
    isLoading: false,
    createTag: vi.fn(),
    createTagOptimistic: vi.fn(),
    deleteTag: vi.fn(),
    isCreating: false,
    isDeleting: false,
  });
}

function renderMobileView(props: { accountId?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(TransactionsMobileView, props)
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TransactionsMobileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('rendering — expenses tab (default)', () => {
    it('renders expense transaction names by default', () => {
      renderMobileView();
      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Netflix')).toBeTruthy();
    });

    it('renders search input in the expenses tab', () => {
      renderMobileView();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('shows empty state when no expenses exist', () => {
      setupAllMocks({ expenses: [] });
      renderMobileView();
      expect(screen.getByText('No transactions match your filters.')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('shows spinner when expenses are loading', () => {
      setupAllMocks({ expensesLoading: true });
      renderMobileView();
      // Loader2 renders as an SVG; verify no transaction cards are shown
      expect(screen.queryByTestId('transaction-card')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('search input wiring', () => {
    it('typing in search input updates the search term (debounced)', async () => {
      renderMobileView();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Groc' } });

      await waitFor(
        () => {
          const calls = vi.mocked(useExpenseTransactionsQuery).mock.calls;
          const lastCall = calls[calls.length - 1][0];
          expect(lastCall.search).toBe('Groc');
        },
        { timeout: 1000 }
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('transaction click — opens edit drawer', () => {
    it('renders transaction cards that are clickable', () => {
      renderMobileView();
      const cards = screen.getAllByTestId('transaction-card');
      expect(cards.length).toBeGreaterThan(0);
      // Clicking should not throw
      expect(() => fireEvent.click(cards[0])).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe('server-side filters', () => {
    const lastExpenseParams = () => {
      const calls = vi.mocked(useExpenseTransactionsQuery).mock.calls;
      return calls[calls.length - 1][0] as any;
    };
    const lastIncomeParams = () => {
      const calls = vi.mocked(useIncomeTransactionsQuery).mock.calls;
      return calls[calls.length - 1][0] as any;
    };
    const lastTransferParams = () => {
      const calls = vi.mocked(useTransfersQuery).mock.calls;
      return calls[calls.length - 1][0] as any;
    };

    beforeAll(() => {
      globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
      Element.prototype.scrollIntoView ??= () => {};
      window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    });

    it('queries with no dates or filters by default and shows no summary', () => {
      renderMobileView();
      const params = lastExpenseParams();
      expect(params.startDate).toBeUndefined();
      expect(params.endDate).toBeUndefined();
      expect(params.filters.accountIds).toEqual([]);
      expect(params.dateFilter).toBeUndefined();
      expect(screen.queryByText(/across 2 transactions/)).toBeNull();
    });

    it('offers all four date presets including This Week', () => {
      renderMobileView();
      const group = screen.getAllByTestId('toggle-group').find((g) => g.getAttribute('data-value') === 'view-all') as HTMLElement;
      expect(within(group).getByTestId('tab-view-all')).toBeTruthy();
      expect(within(group).getByTestId('tab-this-week')).toBeTruthy();
      expect(within(group).getByTestId('tab-this-month')).toBeTruthy();
      expect(within(group).getByTestId('tab-this-year')).toBeTruthy();
    });

    it('This Week sends a Sunday-Saturday range and shows the summary', () => {
      renderMobileView();
      fireEvent.click(screen.getByTestId('tab-this-week'));
      const params = lastExpenseParams();
      expect(params.startDate).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
      expect(params.endDate).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
      expect(new Date(params.startDate + 'T00:00:00').getDay()).toBe(0);
      expect(new Date(params.endDate + 'T00:00:00').getDay()).toBe(6);
      expect(screen.getByText('across 2 transactions')).toBeTruthy();
    });

    it('Load More stays visible while a preset is active', () => {
      setupAllMocks({ hasMore: true });
      renderMobileView();
      expect(screen.getByText('Load More')).toBeTruthy();
      fireEvent.click(screen.getByTestId('tab-this-month'));
      expect(screen.getByText('Load More')).toBeTruthy();
    });

    it('applying a filter in the drawer re-queries, shows a chip and the total line', () => {
      renderMobileView();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '50' } });
      expect(lastExpenseParams().filters.amountMin).toBe('');
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      expect(lastExpenseParams().filters.amountMin).toBe('50');
      expect(screen.getByText('Amount: ≥ ₱50')).toBeTruthy();
      expect(screen.getByText('₱200.00')).toBeTruthy();
      expect(screen.getByText('across 2 transactions')).toBeTruthy();
    });

    it('removing the chip immediately drops the filter', () => {
      renderMobileView();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      fireEvent.click(screen.getByRole('button', { name: /Remove filter Amount/, hidden: true }));
      expect(lastExpenseParams().filters.amountMin).toBe('');
      expect(screen.queryByText('Amount: ≥ ₱50')).toBeNull();
    });

    it('Clear all resets filters and presets', () => {
      renderMobileView();
      fireEvent.click(screen.getByTestId('tab-this-year'));
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      fireEvent.click(screen.getByRole('button', { name: 'Clear all', hidden: true }));
      const params = lastExpenseParams();
      expect(params.filters.amountMin).toBe('');
      expect(params.startDate).toBeUndefined();
    });

    it('shows the Account filter on the full list but hides it on detail pages', () => {
      const { unmount } = renderMobileView();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      expect(screen.getByRole('button', { name: /any account/i })).toBeTruthy();
      unmount();

      renderMobileView({ accountId: 'acc-1' });
      expect(lastExpenseParams().accountId).toBe('acc-1');
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      expect(screen.queryByRole('button', { name: /any account/i })).toBeNull();
    });

    it('keeps filter state per tab and uses From/To for transfers', () => {
      renderMobileView({ accountId: 'acc-1' });
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.change(screen.getByLabelText('Minimum amount'), { target: { value: '75' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      fireEvent.click(screen.getByTestId('tab-transfers'));
      expect(lastTransferParams().filters.amountMin).toBe('');
      expect(lastTransferParams().accountId).toBe('acc-1');
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      expect(screen.getByText('From account')).toBeTruthy();
      expect(screen.getByText('To account')).toBeTruthy();

      fireEvent.click(screen.getByTestId('tab-income'));
      expect(lastIncomeParams().filters.amountMin).toBe('');
      expect(lastExpenseParams().filters.amountMin).toBe('75');
    });
  });
});