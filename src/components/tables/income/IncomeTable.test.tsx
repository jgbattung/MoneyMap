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

// Forwards item clicks to onValueChange and exposes the controlled value, so
// preset selection and "a custom range deselects the preset" are observable.
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
    }) =>
      React.createElement(
        Ctx.Provider,
        { value: onValueChange },
        React.createElement('div', { 'data-testid': 'toggle-group', 'data-value': value }, children)
      ),
    ToggleGroupItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const onValueChange = React.useContext(Ctx);
      return React.createElement(
        'button',
        { 'data-testid': `toggle-item-${value}`, onClick: () => onValueChange?.(value) },
        children
      );
    },
  };
});

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// The filter UI has its own tests; here the stubs forward the callbacks so the
// table's wiring (params sent to the hook, chip removal, summary) is exercised.
vi.mock('@/components/transactions/filters/TransactionFilterControl', () => ({
  TransactionFilterControl: ({ onApply, activeCount, hideAccount, kind }: any) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'button',
        {
          'data-testid': 'filter-control',
          'data-kind': kind,
          'data-hide-account': String(!!hideAccount),
          'data-active-count': activeCount,
          onClick: () =>
            onApply({
              accountIds: ['acc-1'],
              fromAccountIds: [],
              toAccountIds: [],
              categoryIds: [],
              tagIds: [],
              amountMin: '100',
              amountMax: '',
              startDate: '',
              endDate: '',
            }),
        },
        'Filters'
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'filter-control-range',
          onClick: () =>
            onApply({
              accountIds: [],
              fromAccountIds: [],
              toAccountIds: [],
              categoryIds: [],
              tagIds: [],
              amountMin: '',
              amountMax: '',
              startDate: '2026-01-01',
              endDate: '2026-01-31',
            }),
        },
        'Apply range'
      )
    ),
}));

vi.mock('@/components/transactions/filters/ActiveFilterChips', () => ({
  ActiveFilterChips: ({ filters, onRemove, onClearAll }: any) =>
    filters.amountMin || filters.accountIds.length > 0 || filters.startDate
      ? React.createElement(
          'div',
          { 'data-testid': 'filter-chips' },
          React.createElement('button', { 'data-testid': 'remove-amount-chip', onClick: () => onRemove('amount') }, 'x'),
          React.createElement('button', { 'data-testid': 'clear-all-chips', onClick: onClearAll }, 'Clear all')
        )
      : null,
}));

vi.mock('@/components/transactions/filters/FilterSummary', () => ({
  FilterSummary: ({ total, totalAmount }: any) =>
    React.createElement('div', { 'data-testid': 'filter-summary' }, `${total}|${totalAmount ?? ''}`),
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
import { resolveDatePreset } from '@/lib/transaction-filters';
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
// Emulates the server-side search that the real hook now delegates to the API.
function matchesSearch(row: IncomeTransaction, search?: string): boolean {
  if (!search) return true;
  const s = search.toLowerCase();
  return Boolean(
    row.name.toLowerCase().includes(s) || row.description?.toLowerCase().includes(s) || row.incomeType.name.toLowerCase().includes(s) || row.account.name.toLowerCase().includes(s) || row.tags?.some((tag) => tag.name?.toLowerCase().includes(s))
  );
}

function setupAllMocks(transactions: IncomeTransaction[] = mockTransactions, accountsLoading = false) {
  vi.mocked(useIncomeTransactionsQuery).mockImplementation((opts?: any) => ({
    incomeTransactions: transactions.filter((row) => matchesSearch(row, opts?.search)),
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
  }));

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

function renderIncomeTable(accountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      accountId ? React.createElement(IncomeTable, { accountId }) : React.createElement(IncomeTable)
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
      expect(screen.getByText('No income found')).toBeTruthy();
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

// -----------------------------------------------------------------------
// Server-side filtering wiring
// -----------------------------------------------------------------------
describe('IncomeTable server-side filtering', () => {
  const lastParams = () => (vi.mocked(useIncomeTransactionsQuery).mock.calls.at(-1)?.[0] ?? {}) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  it('queries with no search, dates or panel filters by default', () => {
    renderIncomeTable();
    const params = lastParams();
    expect(params.search).toBe('');
    expect(params.startDate).toBeUndefined();
    expect(params.endDate).toBeUndefined();
    expect(params.filters.accountIds).toEqual([]);
    expect(params.filters.amountMin).toBe('');
  });

  it('renders the filter control for the income kind and no summary or chips yet', () => {
    renderIncomeTable();
    expect(screen.getByTestId('filter-control').getAttribute('data-kind')).toBe('income');
    expect(screen.queryByTestId('filter-chips')).toBeNull();
    expect(screen.queryByTestId('filter-summary')).toBeNull();
  });

  it('sends the applied filters to the hook, then shows chips and the summary', () => {
    const impl = vi.mocked(useIncomeTransactionsQuery).getMockImplementation() as (o?: any) => any;
    vi.mocked(useIncomeTransactionsQuery).mockImplementation((o?: any) => ({ ...impl(o), totalAmount: '1234.00' }));
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    const params = lastParams();
    expect(params.filters.amountMin).toBe('100');
    expect(params.filters.accountIds).toEqual(['acc-1']);
    expect(screen.getByTestId('filter-chips')).toBeTruthy();
    expect(screen.getByTestId('filter-summary').textContent).toMatch(/^[0-9]+\|1234\.00$/);
  });

  it('removing a chip re-queries immediately without that filter', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    fireEvent.click(screen.getByTestId('remove-amount-chip'));
    expect(lastParams().filters.amountMin).toBe('');
    expect(lastParams().filters.accountIds).toEqual(['acc-1']);
  });

  it('Clear all resets the filters and hides the chips and summary', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    fireEvent.click(screen.getByTestId('clear-all-chips'));
    expect(lastParams().filters.amountMin).toBe('');
    expect(lastParams().filters.accountIds).toEqual([]);
    expect(screen.queryByTestId('filter-chips')).toBeNull();
    expect(screen.queryByTestId('filter-summary')).toBeNull();
  });

  it('passes the debounced search to the hook and shows the summary', async () => {
    renderIncomeTable();
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'abc' } });
    await waitFor(() => expect(lastParams().search).toBe('abc'));
    expect(screen.getByTestId('filter-summary')).toBeTruthy();
  });

  it('hides the Account filter on an account detail page and scopes the query', () => {
    renderIncomeTable('acc-9');
    expect(lastParams().accountId).toBe('acc-9');
    expect(screen.getByTestId('filter-control').getAttribute('data-hide-account')).toBe('true');
  });

  it('shows the Account filter on the full list', () => {
    renderIncomeTable();
    expect(screen.getByTestId('filter-control').getAttribute('data-hide-account')).toBe('false');
  });
});

// -----------------------------------------------------------------------
// Date presets and custom range
// -----------------------------------------------------------------------
describe('IncomeTable date presets and custom range', () => {
  const lastParams = () => (vi.mocked(useIncomeTransactionsQuery).mock.calls.at(-1)?.[0] ?? {}) as any;
  const toggleValue = () => screen.getByTestId('toggle-group').getAttribute('data-value');

  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  it('starts on View all with no dates', () => {
    renderIncomeTable();
    expect(toggleValue()).toBe('view-all');
    expect(lastParams().startDate).toBeUndefined();
  });

  it.each(['this-week', 'this-month', 'this-year'] as const)(
    'selecting %s sends its resolved range, selects it and shows the summary',
    (preset) => {
      renderIncomeTable();
      fireEvent.click(screen.getByTestId(`toggle-item-${preset}`));
      const range = resolveDatePreset(preset)!;
      expect(lastParams().startDate).toBe(range.startDate);
      expect(lastParams().endDate).toBe(range.endDate);
      expect(toggleValue()).toBe(preset);
      expect(screen.getByTestId('filter-summary')).toBeTruthy();
    }
  );

  it('going back to View all drops the dates and hides the summary', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('toggle-item-this-month'));
    fireEvent.click(screen.getByTestId('toggle-item-view-all'));
    expect(lastParams().startDate).toBeUndefined();
    expect(lastParams().endDate).toBeUndefined();
    expect(screen.queryByTestId('filter-summary')).toBeNull();
  });

  it('applying a custom range deselects the preset and sends the custom dates', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('toggle-item-this-year'));
    fireEvent.click(screen.getByTestId('filter-control-range'));
    expect(toggleValue()).toBe('');
    expect(lastParams().startDate).toBe('2026-01-01');
    expect(lastParams().endDate).toBe('2026-01-31');
    expect(screen.getByTestId('filter-summary')).toBeTruthy();
  });

  it('selecting a preset after a custom range clears the custom range', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('filter-control-range'));
    fireEvent.click(screen.getByTestId('toggle-item-this-month'));
    const range = resolveDatePreset('this-month')!;
    expect(lastParams().startDate).toBe(range.startDate);
    expect(lastParams().endDate).toBe(range.endDate);
    expect(lastParams().filters.startDate).toBe('');
    expect(lastParams().filters.endDate).toBe('');
    expect(toggleValue()).toBe('this-month');
  });

  it('Clear all after a custom range restores View all', () => {
    renderIncomeTable();
    fireEvent.click(screen.getByTestId('filter-control-range'));
    fireEvent.click(screen.getByTestId('clear-all-chips'));
    expect(toggleValue()).toBe('view-all');
    expect(lastParams().startDate).toBeUndefined();
  });
});
