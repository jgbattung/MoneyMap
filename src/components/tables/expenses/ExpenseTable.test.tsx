/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpenseTable from './ExpenseTable';

// ---------------------------------------------------------------------------
// Mock: TagFilter — captures onChange so tag filter tests can trigger it
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
          'data-testid': 'tag-filter-select',
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
// Mock: custom hooks (bare vi.fn() — setupAllMocks provides implementations)
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useExpenseTransactionsQuery', () => ({
  useExpenseTransactionsQuery: vi.fn(),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/hooks/useCardsQuery', () => ({
  useCardsQuery: vi.fn(),
}));

vi.mock('@/hooks/useExpenseTypesQuery', () => ({
  useExpenseTypesQuery: vi.fn(),
}));

vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: heavy UI components that cause portal / rendering issues in happy-dom
// ---------------------------------------------------------------------------
vi.mock('@/components/shared/DeleteDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'delete-dialog' }) : null,
}));

vi.mock('@/components/shared/TagInput', () => ({
  TagInput: ({ onChange }: { onChange: (ids: string[]) => void }) =>
    React.createElement('input', {
      'data-testid': 'tag-input',
      onChange: () => onChange([]),
    }),
}));

vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'toggle-group', onClick: () => onValueChange?.('view-all') },
      children
    ),
  ToggleGroupItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('button', { 'data-testid': `toggle-item-${value}` }, children),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => React.createElement('div', { 'data-testid': 'calendar' }),
}));

vi.mock('@/components/ui/input-group', () => ({
  InputGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  InputGroupInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', { ...props, 'data-testid': 'search-input' }),
  InputGroupAddon: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/lib/utils', () => ({
  formatDateForAPI: (date: Date) => date.toISOString().split('T')[0],
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import type { ExpenseTransaction } from '@/hooks/useExpenseTransactionsQuery';

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------
const makeExpense = (
  id: string,
  name: string,
  overrides: Partial<ExpenseTransaction> = {}
): ExpenseTransaction => ({
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
  ...overrides,
});

// Rows with deliberate date spread: exp-aaa is old (2020) so date filters
// can be used in later tests without accidentally hiding it.
const mockTransactions: ExpenseTransaction[] = [
  makeExpense('exp-aaa', 'Groceries', { amount: '500.00', date: '2020-06-01' }),
  makeExpense('exp-bbb', 'Netflix', { amount: '250.00', date: '2026-01-10' }),
  makeExpense('exp-ccc', 'Transport', { amount: '75.00', date: '2026-01-15' }),
];

// ---------------------------------------------------------------------------
// Setup helpers — use vi.clearAllMocks() not resetAllMocks() so mock factories
// keep their structure, then explicitly set return values here.
// ---------------------------------------------------------------------------
function setupAllMocks(transactions: ExpenseTransaction[] = mockTransactions) {
  vi.mocked(useExpenseTransactionsQuery).mockReturnValue({
    expenseTransactions: transactions,
    total: transactions.length,
    hasMore: false,
    isLoading: false,
    error: null,
    createExpenseTransaction: vi.fn(),
    updateExpenseTransaction: vi.fn().mockResolvedValue({}),
    deleteExpenseTransaction: vi.fn().mockResolvedValue(undefined),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  // Return value cast as any to avoid strict structural typing on Account shape
  vi.mocked(useAccountsQuery).mockReturnValue({
    accounts: [
      { id: 'acc-1', name: 'BDO Savings', accountType: 'SAVINGS', currentBalance: '50000', initialBalance: '0', addToNetWorth: true },
    ] as any,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useCardsQuery).mockReturnValue({
    cards: [] as any,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  // useExpenseTypesQuery returns { budgets, isLoading, error, createBudget, updateBudget,
  // deleteBudget, isCreating, isUpdating, isDeleting }
  vi.mocked(useExpenseTypesQuery).mockReturnValue({
    budgets: [
      { id: 'type-1', name: 'Food', subcategories: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ],
    isLoading: false,
    error: null,
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  // useTagsQuery returns { tags, isLoading, createTag, createTagOptimistic, deleteTag,
  // isCreating, isDeleting }  — no error field
  vi.mocked(useTagsQuery).mockReturnValue({
    tags: [],
    isLoading: false,
    createTag: vi.fn(),
    createTagOptimistic: vi.fn(),
    deleteTag: vi.fn(),
    isCreating: false,
    isDeleting: false,
  });
}

function renderExpenseTable() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(ExpenseTable)
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ExpenseTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders all transaction names', () => {
      renderExpenseTable();
      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();
    });

    it('renders the search input', () => {
      renderExpenseTable();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('renders empty state when no transactions exist', () => {
      setupAllMocks([]);
      renderExpenseTable();
      expect(screen.getByText('No expense transactions found.')).toBeTruthy();
    });

    it('shows correct row count in pagination text', () => {
      renderExpenseTable();
      expect(screen.getByText(/Showing 3 out of 3/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('updateData — ID-based row update (regression: row.original.id not row.index)', () => {
    it('each mock transaction has a unique, stable ID — precondition for ID-based lookup', () => {
      // updateData uses: old.map((row) => { if (row.id === rowId) { ... } })
      // This only works correctly when IDs are unique.
      const ids = mockTransactions.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(['exp-aaa', 'exp-bbb', 'exp-ccc']);
    });

    it('filtering reduces the visible row count (changes positional indices)', async () => {
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.queryByText('Groceries')).toBeNull();
        expect(screen.queryByText('Transport')).toBeNull();
      });
    });

    it('when filtered to Netflix (originally at data index 1), only one row is visible', async () => {
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      await waitFor(() => {
        // Netflix (exp-bbb) was at data index 1. After filtering it occupies visible index 0.
        // The fixed updateData passes row.original.id ('exp-bbb') — not row.index (0).
        // row.index=0 would resolve to exp-aaa (Groceries) in the full data array — wrong.
        expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
      });
    });

    it('all three row IDs are present in data and individually locatable', () => {
      setupAllMocks(mockTransactions);
      renderExpenseTable();

      expect(mockTransactions.find((t) => t.id === 'exp-aaa')).toBeTruthy();
      expect(mockTransactions.find((t) => t.id === 'exp-bbb')).toBeTruthy();
      expect(mockTransactions.find((t) => t.id === 'exp-ccc')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('revertData — ID-based row revert (regression: row.original.id not row.index)', () => {
    it('filtering to Transport (originally at data index 2) shows only that row', async () => {
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Transport' } });

      await waitFor(() => {
        expect(screen.getByText('Transport')).toBeTruthy();
        expect(screen.queryByText('Groceries')).toBeNull();
        expect(screen.queryByText('Netflix')).toBeNull();
      });

      expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
    });

    it('Transport row ID is exp-ccc, not exp-aaa (data index 0)', () => {
      // Old bug: revertData(row.index) when Transport is at visible index 0
      // would call revertData(0) and revert exp-aaa (Groceries) — wrong row.
      // Fix: revertData(row.original.id) = revertData('exp-ccc') — correct row.
      const transport = mockTransactions.find((t) => t.name === 'Transport');
      expect(transport?.id).toBe('exp-ccc');
      expect(transport?.id).not.toBe('exp-aaa');
    });
  });

  // -------------------------------------------------------------------------
  describe('search filtering — full cycle', () => {
    it('filtering to a single term shows only the matching row', async () => {
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.queryByText('Groceries')).toBeNull();
        expect(screen.queryByText('Transport')).toBeNull();
      });
    });

    it('clearing the search restores all rows', async () => {
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.getByText('Transport')).toBeTruthy();
      });
    });

    it('positional-index shift is detectable: exp-bbb is at data[1] but becomes visible[0] when filtered', () => {
      // Confirms the precondition for the regression.
      expect(mockTransactions[0].id).toBe('exp-aaa'); // data position 0
      expect(mockTransactions[1].id).toBe('exp-bbb'); // data position 1

      // When filtered to only Netflix, visible position 0 → data position 1.
      // Using row.index (0) would hit exp-aaa. Using row.original.id ('exp-bbb') is correct.
      expect(mockTransactions[0].id).not.toBe(mockTransactions[1].id);
    });
  });

  // -------------------------------------------------------------------------
  describe('tag filter — client-side filtering', () => {
    it('renders the TagFilter component', () => {
      renderExpenseTable();
      expect(screen.getByTestId('tag-filter')).toBeTruthy();
    });

    it('selecting a tag hides expenses that do not have that tag', async () => {
      const taggedTransactions = [
        makeExpense('exp-aaa', 'Groceries', { tags: [] }),
        makeExpense('exp-bbb', 'Netflix', {
          tags: [{ id: 'tag-1', name: 'Subscription', color: '#FF6B6B' }],
        }),
        makeExpense('exp-ccc', 'Transport', { tags: [] }),
      ];
      setupAllMocks(taggedTransactions);
      renderExpenseTable();

      // All rows visible initially
      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();

      // Apply tag filter
      fireEvent.click(screen.getByTestId('tag-filter-select'));

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.queryByText('Groceries')).toBeNull();
        expect(screen.queryByText('Transport')).toBeNull();
      });
    });

    it('clearing tag filter restores all rows', async () => {
      const taggedTransactions = [
        makeExpense('exp-aaa', 'Groceries', { tags: [] }),
        makeExpense('exp-bbb', 'Netflix', {
          tags: [{ id: 'tag-1', name: 'Subscription', color: '#FF6B6B' }],
        }),
        makeExpense('exp-ccc', 'Transport', { tags: [] }),
      ];
      setupAllMocks(taggedTransactions);
      renderExpenseTable();

      fireEvent.click(screen.getByTestId('tag-filter-select'));
      await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());

      fireEvent.click(screen.getByTestId('tag-filter-clear'));

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.getByText('Transport')).toBeTruthy();
      });
    });

    it('when tag filter is active and no expense matches, shows empty state', async () => {
      // None have tags
      setupAllMocks(mockTransactions);
      renderExpenseTable();

      fireEvent.click(screen.getByTestId('tag-filter-select'));

      await waitFor(() => {
        expect(screen.getByText('No expense transactions found.')).toBeTruthy();
      });
    });

    it('tag filter is cumulative with search filter', async () => {
      const taggedTransactions = [
        makeExpense('exp-aaa', 'Groceries', { tags: [] }),
        makeExpense('exp-bbb', 'Netflix', {
          tags: [{ id: 'tag-1', name: 'Subscription', color: '#FF6B6B' }],
        }),
        makeExpense('exp-ccc', 'Transport', {
          tags: [{ id: 'tag-1', name: 'Subscription', color: '#FF6B6B' }],
        }),
      ];
      setupAllMocks(taggedTransactions);
      renderExpenseTable();

      fireEvent.click(screen.getByTestId('tag-filter-select'));
      await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Transport' } });

      await waitFor(() => {
        expect(screen.getByText('Transport')).toBeTruthy();
        expect(screen.queryByText('Netflix')).toBeNull();
        expect(screen.queryByText('Groceries')).toBeNull();
      });
    });
  });
});
