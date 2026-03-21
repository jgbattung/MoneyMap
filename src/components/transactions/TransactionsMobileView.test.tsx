import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('@/components/ui/toggle-group', () => ({
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
      'div',
      {
        'data-testid': 'toggle-group',
        'data-value': value,
      },
      children,
      React.createElement(
        'button',
        {
          'data-testid': 'switch-tab',
          onClick: () => onValueChange?.('income'),
        },
        'switch to income'
      )
    ),
  ToggleGroupItem: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value: string;
    onClick?: () => void;
  }) =>
    React.createElement(
      'button',
      {
        'data-testid': `tab-${value}`,
        onClick,
      },
      children
    ),
}));

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
} = {}) {
  const {
    expensesLoading = false,
    incomeLoading = false,
    transfersLoading = false,
    expenses = mockExpenses,
    income = mockIncome,
    transfers = mockTransfers,
  } = overrides;

  vi.mocked(useExpenseTransactionsQuery).mockReturnValue({
    expenseTransactions: expenses,
    total: expenses.length,
    hasMore: false,
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
    hasMore: false,
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
    hasMore: false,
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
      expect(screen.getByText('No results found')).toBeTruthy();
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
});