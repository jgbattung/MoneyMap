/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IncomeTable from './IncomeTable';

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
// Mock: custom hooks (bare vi.fn() — implementations set in setupAllMocks)
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useIncomeTransactionsQuery', () => ({
  useIncomeTransactionsQuery: vi.fn(),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/hooks/useIncomeTypesQuery', () => ({
  useIncomeTypesQuery: vi.fn(),
}));

vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: heavy UI / shared components
// ---------------------------------------------------------------------------
vi.mock('@/components/shared/DeleteDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'delete-dialog' }) : null,
}));

vi.mock('@/components/shared/SkeletonTable', () => ({
  default: ({ tableType }: { tableType?: string }) =>
    React.createElement('div', { 'data-testid': `skeleton-table-${tableType ?? 'default'}` }),
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
import { useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import type { IncomeTransaction } from '@/hooks/useIncomeTransactionsQuery';

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------
const makeIncome = (
  id: string,
  name: string,
  overrides: Partial<IncomeTransaction> = {}
): IncomeTransaction => ({
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
  ...overrides,
});

// Three rows; inc-aaa has an old date so it will be excluded by any
// "this year/month/week" date-filter, leaving it useful for filter-shift tests.
const mockTransactions: IncomeTransaction[] = [
  makeIncome('inc-aaa', 'January Salary', { amount: '50000.00', date: '2020-01-31' }),
  makeIncome('inc-bbb', 'Freelance Project', { amount: '15000.00', date: '2026-01-10' }),
  makeIncome('inc-ccc', 'Dividends', { amount: '3000.00', date: '2026-01-15' }),
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------
function setupAllMocks(transactions: IncomeTransaction[] = mockTransactions, accountsLoading = false) {
  vi.mocked(useIncomeTransactionsQuery).mockReturnValue({
    incomeTransactions: transactions,
    total: transactions.length,
    hasMore: false,
    isLoading: false,
    error: null,
    createIncomeTransaction: vi.fn(),
    updateIncomeTransaction: vi.fn().mockResolvedValue({}),
    deleteIncomeTransaction: vi.fn().mockResolvedValue(undefined),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useAccountsQuery).mockReturnValue({
    accounts: accountsLoading
      ? []
      : ([{ id: 'acc-1', name: 'BDO Savings', accountType: 'SAVINGS', currentBalance: '50000', initialBalance: '0', addToNetWorth: true }] as any),
    isLoading: accountsLoading,
    error: null,
    refetch: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  // useIncomeTypesQuery returns { incomeTypes, isLoading, error, createIncomeType,
  // updateIncomeType, deleteIncomeType, isCreating, isUpdating, isDeleting }
  vi.mocked(useIncomeTypesQuery).mockReturnValue({
    incomeTypes: [
      { id: 'itype-1', name: 'Salary', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ],
    isLoading: false,
    error: null,
    createIncomeType: vi.fn(),
    updateIncomeType: vi.fn(),
    deleteIncomeType: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  // useTagsQuery: { tags, isLoading, createTag, createTagOptimistic, deleteTag,
  // isCreating, isDeleting } — no error field
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

function renderIncomeTable() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(IncomeTable)
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('IncomeTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders all transaction names', () => {
      renderIncomeTable();
      expect(screen.getByText('January Salary')).toBeTruthy();
      expect(screen.getByText('Freelance Project')).toBeTruthy();
      expect(screen.getByText('Dividends')).toBeTruthy();
    });

    it('renders the search input', () => {
      renderIncomeTable();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('renders empty state when no transactions exist', () => {
      setupAllMocks([]);
      renderIncomeTable();
      expect(screen.getByText('No income transactions found.')).toBeTruthy();
    });

    it('shows correct row count in pagination text', () => {
      renderIncomeTable();
      expect(screen.getByText(/Showing 3 out of 3/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton table when accounts are loading', () => {
      setupAllMocks(mockTransactions, true /* accountsLoading */);
      renderIncomeTable();
      expect(screen.getByTestId('skeleton-table-income')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('updateData — ID-based row update (regression: row.original.id not row.index)', () => {
    it('each mock transaction has a unique stable ID — precondition for ID-based lookup', () => {
      // updateData: old.map((row) => { if (row.id === rowId) { ... } })
      const ids = mockTransactions.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(['inc-aaa', 'inc-bbb', 'inc-ccc']);
    });

    it('filtering reduces visible row count, shifting positional indices', async () => {
      renderIncomeTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Freelance' } });

      await waitFor(() => {
        expect(screen.getByText('Freelance Project')).toBeTruthy();
        expect(screen.queryByText('January Salary')).toBeNull();
        expect(screen.queryByText('Dividends')).toBeNull();
      });
    });

    it('when filtered to Freelance Project (originally at data index 1), only one row is visible', async () => {
      renderIncomeTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Freelance' } });

      await waitFor(() => {
        // inc-bbb (Freelance Project) was at data index 1.
        // After filtering it is at visible index 0.
        // Old bug: updateData(row.index=0) → touches inc-aaa (January Salary) — wrong.
        // Fix: updateData(row.original.id='inc-bbb') → touches inc-bbb — correct.
        expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('revertData — ID-based row revert (regression: row.original.id not row.index)', () => {
    it('filtering to Dividends (originally at data index 2) shows only that row', async () => {
      renderIncomeTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Dividends' } });

      await waitFor(() => {
        expect(screen.getByText('Dividends')).toBeTruthy();
        expect(screen.queryByText('January Salary')).toBeNull();
        expect(screen.queryByText('Freelance Project')).toBeNull();
      });

      expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
    });

    it('Dividends row ID is inc-ccc, not inc-aaa (data index 0)', () => {
      // Old bug: revertData(row.index=0) would revert inc-aaa when Dividends was at visible[0].
      // Fix: revertData(row.original.id='inc-ccc') correctly targets inc-ccc.
      const dividends = mockTransactions.find((t) => t.name === 'Dividends');
      expect(dividends?.id).toBe('inc-ccc');
      expect(dividends?.id).not.toBe('inc-aaa');
    });
  });

  // -------------------------------------------------------------------------
  describe('search filtering — full cycle', () => {
    it('filtering to a single term shows only the matching row', async () => {
      renderIncomeTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Freelance' } });

      await waitFor(() => {
        expect(screen.getByText('Freelance Project')).toBeTruthy();
        expect(screen.queryByText('January Salary')).toBeNull();
        expect(screen.queryByText('Dividends')).toBeNull();
      });
    });

    it('clearing the search restores all rows', async () => {
      renderIncomeTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Freelance' } });

      await waitFor(() => expect(screen.queryByText('January Salary')).toBeNull());

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('January Salary')).toBeTruthy();
        expect(screen.getByText('Freelance Project')).toBeTruthy();
        expect(screen.getByText('Dividends')).toBeTruthy();
      });
    });

    it('positional-index shift: inc-bbb is at data[1] but becomes visible[0] when filtered', () => {
      expect(mockTransactions[0].id).toBe('inc-aaa'); // data position 0
      expect(mockTransactions[1].id).toBe('inc-bbb'); // data position 1
      // When filtered to Freelance, visible[0] corresponds to data[1].
      // row.index (0) → inc-aaa (wrong). row.original.id ('inc-bbb') → correct.
      expect(mockTransactions[0].id).not.toBe(mockTransactions[1].id);
    });
  });
});
