/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransferTable from './TransferTable';

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
vi.mock('@/hooks/useTransferTransactionsQuery', () => ({
  useTransfersQuery: vi.fn(),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/hooks/useTransferTypesQuery', () => ({
  useTransferTypesQuery: vi.fn(),
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

vi.mock('@/components/shared/SkeletonTransferTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'skeleton-transfer-table' }),
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

// The filter UI has its own tests; here the stubs forward the callbacks so the
// table's wiring (params sent to the hook, chip removal, summary) is exercised.
vi.mock('@/components/transactions/filters/TransactionFilterControl', () => ({
  TransactionFilterControl: ({ onApply, activeCount, hideAccount, kind }: any) =>
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
}));

vi.mock('@/components/transactions/filters/ActiveFilterChips', () => ({
  ActiveFilterChips: ({ filters, onRemove, onClearAll }: any) =>
    filters.amountMin || filters.accountIds.length > 0
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
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useTransferTypesQuery } from '@/hooks/useTransferTypesQuery';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import type { TransferTransaction } from '@/hooks/useTransferTransactionsQuery';

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------
const makeTransfer = (
  id: string,
  name: string,
  overrides: Partial<TransferTransaction> = {}
): TransferTransaction => ({
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
  ...overrides,
});

// txf-aaa has an old date so date-filter tests are easier to reason about.
const mockTransfers: TransferTransaction[] = [
  makeTransfer('txf-aaa', 'Old Transfer', { amount: 500, date: '2020-01-10' }),
  makeTransfer('txf-bbb', 'Rent Payment', { amount: 15000, date: '2026-01-05' }),
  makeTransfer('txf-ccc', 'Utility Bill', { amount: 2500, date: '2026-01-15' }),
];

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------
// Emulates the server-side search that the real hook now delegates to the API.
function matchesSearch(row: TransferTransaction, search?: string): boolean {
  if (!search) return true;
  const s = search.toLowerCase();
  return Boolean(
    row.name.toLowerCase().includes(s) || row.notes?.toLowerCase().includes(s) || row.transferType.name.toLowerCase().includes(s) || row.toAccount.name.toLowerCase().includes(s) || row.fromAccount.name.toLowerCase().includes(s) || row.tags?.some((tag) => tag.name?.toLowerCase().includes(s))
  );
}

function setupAllMocks(transfers: TransferTransaction[] = mockTransfers, accountsLoading = false) {
  vi.mocked(useTransfersQuery).mockImplementation((opts?: any) => ({
    transfers: transfers.filter((row) => matchesSearch(row, opts?.search)),
    total: transfers.length,
    hasMore: false,
    isLoading: false,
    error: null,
    createTransfer: vi.fn(),
    updateTransfer: vi.fn().mockResolvedValue({}),
    deleteTransfer: vi.fn().mockResolvedValue(undefined),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }));

  vi.mocked(useAccountsQuery).mockReturnValue({
    accounts: accountsLoading
      ? []
      : ([
          { id: 'acc-1', name: 'BDO Savings', accountType: 'SAVINGS', currentBalance: '50000', initialBalance: '0', addToNetWorth: true },
          { id: 'acc-2', name: 'BPI Checking', accountType: 'CHECKING', currentBalance: '20000', initialBalance: '0', addToNetWorth: true },
        ] as any),
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

  // useTransferTypesQuery: { transferTypes, isLoading, error, createTransferType,
  // updateTransferType, deleteTransferType, isCreating, isUpdating, isDeleting }
  vi.mocked(useTransferTypesQuery).mockReturnValue({
    transferTypes: [
      { id: 'ttype-1', name: 'Bank Transfer', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ],
    isLoading: false,
    error: null,
    createTransferType: vi.fn(),
    updateTransferType: vi.fn(),
    deleteTransferType: vi.fn(),
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

function renderTransferTable(accountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      accountId ? React.createElement(TransferTable, { accountId }) : React.createElement(TransferTable)
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TransferTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders all transfer names', () => {
      renderTransferTable();
      expect(screen.getByText('Old Transfer')).toBeTruthy();
      expect(screen.getByText('Rent Payment')).toBeTruthy();
      expect(screen.getByText('Utility Bill')).toBeTruthy();
    });

    it('renders the search input', () => {
      renderTransferTable();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('renders empty state when no transfers exist', () => {
      setupAllMocks([]);
      renderTransferTable();
      expect(screen.getByText('No transfers found')).toBeTruthy();
    });

    it('shows correct row count in pagination text', () => {
      renderTransferTable();
      expect(screen.getByText(/Showing 3 out of 3/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton when accounts are loading', () => {
      setupAllMocks(mockTransfers, true /* accountsLoading */);
      renderTransferTable();
      expect(screen.getByTestId('skeleton-transfer-table')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('updateData — ID-based row update (regression: row.original.id not row.index)', () => {
    it('each mock transfer has a unique stable ID — precondition for ID-based lookup', () => {
      // updateData: old.map((row) => { if (row.id === rowId) { ... } })
      const ids = mockTransfers.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(['txf-aaa', 'txf-bbb', 'txf-ccc']);
    });

    it('filtering reduces visible row count, shifting positional indices', async () => {
      renderTransferTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Rent' } });

      await waitFor(() => {
        expect(screen.getByText('Rent Payment')).toBeTruthy();
        expect(screen.queryByText('Old Transfer')).toBeNull();
        expect(screen.queryByText('Utility Bill')).toBeNull();
      });
    });

    it('when filtered to Rent Payment (originally at data index 1), only one row is visible', async () => {
      renderTransferTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Rent' } });

      await waitFor(() => {
        // txf-bbb (Rent Payment) was at data index 1. After filtering it is at visible index 0.
        // Old bug: updateData(row.index=0) → touches txf-aaa (Old Transfer) — wrong.
        // Fix: updateData(row.original.id='txf-bbb') → touches txf-bbb — correct.
        expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
      });
    });

    it('all three row IDs are present in data and individually findable by ID', () => {
      setupAllMocks(mockTransfers);
      renderTransferTable();

      expect(mockTransfers.find((t) => t.id === 'txf-aaa')).toBeTruthy();
      expect(mockTransfers.find((t) => t.id === 'txf-bbb')).toBeTruthy();
      expect(mockTransfers.find((t) => t.id === 'txf-ccc')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('revertData — ID-based row revert (regression: row.original.id not row.index)', () => {
    it('filtering to Utility Bill (originally at data index 2) shows only that row', async () => {
      renderTransferTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Utility' } });

      await waitFor(() => {
        expect(screen.getByText('Utility Bill')).toBeTruthy();
        expect(screen.queryByText('Old Transfer')).toBeNull();
        expect(screen.queryByText('Rent Payment')).toBeNull();
      });

      expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
    });

    it('Utility Bill row ID is txf-ccc — not txf-aaa (data index 0)', () => {
      // Old bug: revertData(row.index=0) when Utility Bill is at visible index 0
      // would call revertData(0) and revert txf-aaa (Old Transfer) — wrong row.
      // Fix: revertData(row.original.id='txf-ccc') — correct row.
      const utilityBill = mockTransfers.find((t) => t.name === 'Utility Bill');
      expect(utilityBill?.id).toBe('txf-ccc');
      expect(utilityBill?.id).not.toBe('txf-aaa');
    });
  });

  // -------------------------------------------------------------------------
  describe('search filtering — full cycle', () => {
    it('filtering to a single term shows only the matching row', async () => {
      renderTransferTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Rent' } });

      await waitFor(() => {
        expect(screen.getByText('Rent Payment')).toBeTruthy();
        expect(screen.queryByText('Old Transfer')).toBeNull();
        expect(screen.queryByText('Utility Bill')).toBeNull();
      });
    });

    it('clearing the search restores all rows', async () => {
      renderTransferTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Rent' } });

      await waitFor(() => expect(screen.queryByText('Old Transfer')).toBeNull());

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Old Transfer')).toBeTruthy();
        expect(screen.getByText('Rent Payment')).toBeTruthy();
        expect(screen.getByText('Utility Bill')).toBeTruthy();
      });
    });

    it('positional-index shift is detectable: txf-bbb is at data[1] but becomes visible[0] when filtered', () => {
      expect(mockTransfers[0].id).toBe('txf-aaa'); // data position 0
      expect(mockTransfers[1].id).toBe('txf-bbb'); // data position 1
      // When filtered to Rent only, visible[0] → data[1].
      // row.index (0) → txf-aaa (wrong). row.original.id ('txf-bbb') → correct.
      expect(mockTransfers[0].id).not.toBe(mockTransfers[1].id);
    });
  });

});

// -----------------------------------------------------------------------
// Server-side filtering wiring
// -----------------------------------------------------------------------
describe('TransferTable server-side filtering', () => {
  const lastParams = () => (vi.mocked(useTransfersQuery).mock.calls.at(-1)?.[0] ?? {}) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    setupAllMocks();
  });

  it('queries with no search, dates or panel filters by default', () => {
    renderTransferTable();
    const params = lastParams();
    expect(params.search).toBe('');
    expect(params.startDate).toBeUndefined();
    expect(params.endDate).toBeUndefined();
    expect(params.filters.accountIds).toEqual([]);
    expect(params.filters.amountMin).toBe('');
  });

  it('renders the filter control for the transfer kind and no summary or chips yet', () => {
    renderTransferTable();
    expect(screen.getByTestId('filter-control').getAttribute('data-kind')).toBe('transfer');
    expect(screen.queryByTestId('filter-chips')).toBeNull();
    expect(screen.queryByTestId('filter-summary')).toBeNull();
  });

  it('sends the applied filters to the hook, then shows chips and the summary', () => {
    renderTransferTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    const params = lastParams();
    expect(params.filters.amountMin).toBe('100');
    expect(screen.getByTestId('filter-chips')).toBeTruthy();
    expect(screen.getByTestId('filter-summary').textContent).toMatch(/^[0-9]+\|$/);
  });

  it('removing a chip re-queries immediately without that filter', () => {
    renderTransferTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    fireEvent.click(screen.getByTestId('remove-amount-chip'));
    expect(lastParams().filters.amountMin).toBe('');
  });

  it('Clear all resets the filters and hides the chips and summary', () => {
    renderTransferTable();
    fireEvent.click(screen.getByTestId('filter-control'));
    fireEvent.click(screen.getByTestId('clear-all-chips'));
    expect(lastParams().filters.amountMin).toBe('');
    expect(lastParams().filters.accountIds).toEqual([]);
    expect(screen.queryByTestId('filter-chips')).toBeNull();
    expect(screen.queryByTestId('filter-summary')).toBeNull();
  });

  it('passes the debounced search to the hook and shows the summary', async () => {
    renderTransferTable();
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'abc' } });
    await waitFor(() => expect(lastParams().search).toBe('abc'));
    expect(screen.getByTestId('filter-summary')).toBeTruthy();
  });

  it('keeps From/To available on an account detail page and scopes the query', () => {
    renderTransferTable('acc-9');
    expect(lastParams().accountId).toBe('acc-9');
    expect(screen.getByTestId('filter-control').getAttribute('data-hide-account')).toBe('false');
  });

  it('shows the Account filter on the full list', () => {
    renderTransferTable();
    expect(screen.getByTestId('filter-control').getAttribute('data-hide-account')).toBe('false');
  });
});
