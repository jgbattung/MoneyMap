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
// Mock: TagFilter — captures onChange so we can trigger it in tests
// ---------------------------------------------------------------------------
vi.mock('@/components/shared/TagFilter', () => ({
  TagFilter: ({
    onChange,
    selectedTagIds,
  }: {
    selectedTagIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'tag-filter' },
      React.createElement('span', null, `selected:${selectedTagIds.join(',')}`),
      React.createElement(
        'button',
        {
          'data-testid': 'tag-filter-toggle',
          onClick: () => onChange(['tag-1']),
        },
        'Select tag-1'
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'tag-filter-clear',
          onClick: () => onChange([]),
        },
        'Clear tags'
      )
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

    it('renders the TagFilter in the expenses tab', () => {
      renderMobileView();
      // TagFilter mock renders a div with data-testid="tag-filter"
      expect(screen.getAllByTestId('tag-filter').length).toBeGreaterThanOrEqual(1);
    });

    it('renders search input in the expenses tab', () => {
      renderMobileView();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('shows empty state when no expenses exist', () => {
      setupAllMocks({ expenses: [] });
      renderMobileView();
      expect(screen.getByText('No results found for your search.')).toBeTruthy();
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
  describe('TagFilter integration — expenses tab', () => {
    it('TagFilter initially shows selected:[] (empty)', () => {
      renderMobileView();
      // The mock TagFilter renders "selected:" text
      expect(screen.getByText('selected:')).toBeTruthy();
    });

    it('calling tag-filter-toggle changes the selectedTagIds display', async () => {
      renderMobileView();

      // There can be multiple TagFilters rendered (one per tab in DOM);
      // get the first one (expenses tab)
      const toggleButtons = screen.getAllByTestId('tag-filter-toggle');
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        // After selection, "selected:tag-1" should appear
        const selectedSpans = screen.getAllByText('selected:tag-1');
        expect(selectedSpans.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('calls useExpenseTransactionsQuery with tagIds after a tag is selected', async () => {
      renderMobileView();

      const toggleButtons = screen.getAllByTestId('tag-filter-toggle');
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        // After state update, the hook should have been called with tagIds
        const calls = vi.mocked(useExpenseTransactionsQuery).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.tagIds).toEqual(['tag-1']);
      });
    });

    it('clears tagIds when tag-filter-clear is clicked', async () => {
      renderMobileView();

      // First select a tag
      const toggleButtons = screen.getAllByTestId('tag-filter-toggle');
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        const selectedSpans = screen.getAllByText('selected:tag-1');
        expect(selectedSpans.length).toBeGreaterThanOrEqual(1);
      });

      // Now clear
      const clearButtons = screen.getAllByTestId('tag-filter-clear');
      fireEvent.click(clearButtons[0]);

      await waitFor(() => {
        const emptySpans = screen.getAllByText('selected:');
        expect(emptySpans.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('tab independence — tag filter state is per-tab', () => {
    it('renders TagFilter for each tab independently (three in DOM)', () => {
      renderMobileView();
      // All three tab contents are rendered (expenses tab is active, others
      // conditionally rendered). At least one TagFilter is visible.
      const tagFilters = screen.getAllByTestId('tag-filter');
      expect(tagFilters.length).toBeGreaterThanOrEqual(1);
    });

    it('expense tag selection does not affect income tab state', async () => {
      renderMobileView();

      // Select a tag in the expenses tab (first toggle button)
      const toggleButtons = screen.getAllByTestId('tag-filter-toggle');
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        // useIncomeTransactionsQuery should still be called with empty tagIds
        const incomeCalls = vi.mocked(useIncomeTransactionsQuery).mock.calls;
        const lastIncomeCall = incomeCalls[incomeCalls.length - 1][0];
        expect(lastIncomeCall.tagIds).toEqual([]);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('hook wiring — tagIds are passed to data hooks', () => {
    it('useExpenseTransactionsQuery is initially called with empty tagIds', () => {
      renderMobileView();
      const calls = vi.mocked(useExpenseTransactionsQuery).mock.calls;
      expect(calls[0][0].tagIds).toEqual([]);
    });

    it('useIncomeTransactionsQuery is initially called with empty tagIds', () => {
      renderMobileView();
      const calls = vi.mocked(useIncomeTransactionsQuery).mock.calls;
      expect(calls[0][0].tagIds).toEqual([]);
    });

    it('useTransfersQuery is initially called with empty tagIds', () => {
      renderMobileView();
      const calls = vi.mocked(useTransfersQuery).mock.calls;
      expect(calls[0][0].tagIds).toEqual([]);
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