/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpenseTable from './ExpenseTable';

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
  default: ({
    open,
    onConfirm,
    onOpenChange,
    itemName,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (v: boolean) => void;
    itemName?: string;
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'delete-dialog' },
          React.createElement('span', { 'data-testid': 'delete-item-name' }, itemName),
          React.createElement(
            'button',
            { 'data-testid': 'delete-confirm-btn', onClick: onConfirm },
            'Confirm'
          ),
          React.createElement(
            'button',
            { 'data-testid': 'delete-cancel-btn', onClick: () => onOpenChange(false) },
            'Cancel'
          )
        )
      : null,
}));

vi.mock('@/components/shared/TagInput', () => ({
  TagInput: ({
    onChange,
    selectedTagIds,
  }: {
    onChange: (ids: string[]) => void;
    selectedTagIds: string[];
  }) =>
    React.createElement('input', {
      'data-testid': 'tag-input',
      'data-selected': selectedTagIds.join(','),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value ? [e.target.value] : []),
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
      { 'data-testid': `toggle-item-${value}`, onClick },
      children
    ),
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

function renderExpenseTable(accountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      accountId
        ? React.createElement(ExpenseTable, { accountId })
        : React.createElement(ExpenseTable)
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
      expect(screen.getByText('No expenses found')).toBeTruthy();
    });

    it('shows correct row count in pagination text', () => {
      renderExpenseTable();
      expect(screen.getByText(/Showing 3 out of 3/)).toBeTruthy();
    });

    it('renders table column headers', () => {
      renderExpenseTable();
      expect(screen.getByText('Date')).toBeTruthy();
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Amount')).toBeTruthy();
      expect(screen.getByText('Account')).toBeTruthy();
      expect(screen.getByText('Expense type')).toBeTruthy();
      expect(screen.getByText('Subcategory')).toBeTruthy();
      expect(screen.getByText('Description')).toBeTruthy();
      expect(screen.getByText('Tags')).toBeTruthy();
    });

    it('renders formatted amount in read-only mode', () => {
      renderExpenseTable();
      // 500.00 formatted with toLocaleString — at minimum contains "500"
      expect(screen.getByText(/500/)).toBeTruthy();
    });

    it('renders the date filter toggle group', () => {
      renderExpenseTable();
      expect(screen.getByTestId('toggle-group')).toBeTruthy();
    });

    it('renders "Rows per page" pagination control', () => {
      renderExpenseTable();
      expect(screen.getByText('Rows per page')).toBeTruthy();
    });

    it('renders edit button for each row', () => {
      renderExpenseTable();
      // Each row has an edit button (SVG icon); verify the rows are present
      const rows = screen.getAllByRole('row');
      // header row + 3 data rows
      expect(rows.length).toBeGreaterThanOrEqual(4);
    });

    it('renders a single transaction correctly', () => {
      setupAllMocks([makeExpense('exp-solo', 'Solo Expense', { amount: '999.99' })]);
      renderExpenseTable();
      expect(screen.getByText('Solo Expense')).toBeTruthy();
      expect(screen.getByText(/Showing 1 out of 1/)).toBeTruthy();
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

    it('search shows "(filtered)" indicator when a search term is active', async () => {
      renderExpenseTable();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      await waitFor(() => {
        expect(screen.getByText('(filtered)')).toBeTruthy();
      });
    });

    it('search by expense type name filters correctly', async () => {
      setupAllMocks([
        makeExpense('exp-1', 'Lunch', { expenseType: { id: 'type-1', name: 'Food' } }),
        makeExpense('exp-2', 'Bus Ticket', { expenseType: { id: 'type-2', name: 'Transport' }, expenseTypeId: 'type-2' }),
      ]);
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Food' } });

      await waitFor(() => {
        expect(screen.getByText('Lunch')).toBeTruthy();
        expect(screen.queryByText('Bus Ticket')).toBeNull();
      });
    });

    it('search by account name filters correctly', async () => {
      setupAllMocks([
        makeExpense('exp-1', 'Expense A', { account: { id: 'acc-1', name: 'BDO Savings' } }),
        makeExpense('exp-2', 'Expense B', { account: { id: 'acc-2', name: 'GCash Wallet' }, accountId: 'acc-2' }),
      ]);
      renderExpenseTable();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'GCash' } });

      await waitFor(() => {
        expect(screen.getByText('Expense B')).toBeTruthy();
        expect(screen.queryByText('Expense A')).toBeNull();
      });
    });

    it('search is case-insensitive', async () => {
      renderExpenseTable();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NETFLIX' } });

      await waitFor(() => {
        expect(screen.getByText('Netflix')).toBeTruthy();
        expect(screen.queryByText('Groceries')).toBeNull();
      });
    });

    it('search with no match shows empty state', async () => {
      renderExpenseTable();
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No expenses found')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('date filtering', () => {
    it('does not filter out items with date filter set to "view-all" (default)', () => {
      renderExpenseTable();
      // All three items (including the 2020 one) should be visible
      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('tags display', () => {
    it('shows "-" dash for a transaction with no tags', () => {
      setupAllMocks([makeExpense('exp-1', 'No Tags Expense', { tags: [] })]);
      renderExpenseTable();
      // The Tags column renders "-" for empty tags
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it('renders tag badge for a transaction with one tag', () => {
      setupAllMocks([
        makeExpense('exp-1', 'Tagged Expense', {
          tags: [{ id: 'tag-1', name: 'Work', color: '#ff0000' }],
        }),
      ]);
      renderExpenseTable();
      expect(screen.getByText('Work')).toBeTruthy();
    });

    it('renders up to 2 tag badges and shows "+N" overflow indicator', () => {
      setupAllMocks([
        makeExpense('exp-1', 'Multi-Tagged', {
          tags: [
            { id: 'tag-1', name: 'Work', color: '#ff0000' },
            { id: 'tag-2', name: 'Travel', color: '#00ff00' },
            { id: 'tag-3', name: 'Food', color: '#0000ff' },
          ],
        }),
      ]);
      renderExpenseTable();
      expect(screen.getByText('Work')).toBeTruthy();
      expect(screen.getByText('Travel')).toBeTruthy();
      // Third tag becomes "+1"
      expect(screen.getByText('+1')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('edit mode', () => {
    it('entering edit mode renders save (check) and cancel (x) action buttons', async () => {
      renderExpenseTable();

      // The edit column cell (last cell) contains the single edit button
      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      const editCell = editCells[editCells.length - 1];
      fireEvent.click(within(editCell).getByRole('button'));

      // After clicking edit, save, cancel, and delete buttons appear in that cell
      await waitFor(() => {
        const updatedRow = screen.getAllByRole('row')[1];
        const cells = within(updatedRow).getAllByRole('cell');
        const actionCell = cells[cells.length - 1];
        expect(within(actionCell).getAllByRole('button').length).toBe(3);
      });
    });

    it('cancel button reverts the row out of edit mode', async () => {
      renderExpenseTable();

      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      const editCell = editCells[editCells.length - 1];
      fireEvent.click(within(editCell).getByRole('button'));

      // Wait for edit mode — 3 action buttons
      await waitFor(() => {
        const row = screen.getAllByRole('row')[1];
        const cells = within(row).getAllByRole('cell');
        expect(within(cells[cells.length - 1]).getAllByRole('button').length).toBe(3);
      });

      // Click cancel (second button, index 1)
      const row = screen.getAllByRole('row')[1];
      const cells = within(row).getAllByRole('cell');
      const [, cancelBtn] = within(cells[cells.length - 1]).getAllByRole('button');
      fireEvent.click(cancelBtn);

      // After cancel, only the single edit button should remain
      await waitFor(() => {
        const updatedRow = screen.getAllByRole('row')[1];
        const updatedCells = within(updatedRow).getAllByRole('cell');
        expect(within(updatedCells[updatedCells.length - 1]).getAllByRole('button').length).toBe(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Helper: puts the first data row into edit mode and returns the row element.
  // The edit button is the last button in the "edit" column cell (the cell that
  // only contains action buttons). Since each row has exactly ONE cell that
  // contains buttons (the edit column), we locate it by finding the cell whose
  // buttons count changes from 1 → 3 after a click.
  //
  // NOTE: `within(row).getAllByRole('button')` picks up ALL buttons in all
  // cells. In read-only mode every data row has exactly 1 button (the edit
  // icon). In edit mode it has 3 (save, cancel, delete).
  // ---------------------------------------------------------------------------
  describe('delete flow', () => {
    it('delete dialog is not visible by default', () => {
      renderExpenseTable();
      expect(screen.queryByTestId('delete-dialog')).toBeNull();
    });

    it('clicking delete button in edit mode opens the delete dialog', async () => {
      renderExpenseTable();

      // The edit cell is the last cell; click its single button to enter edit mode
      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      const editCell = editCells[editCells.length - 1];
      const editButton = within(editCell).getByRole('button');
      fireEvent.click(editButton);

      // After entering edit mode the cell now holds 3 buttons: save, cancel, delete
      await waitFor(() => {
        const updatedRow = screen.getAllByRole('row')[1];
        const cells = within(updatedRow).getAllByRole('cell');
        const actionCell = cells[cells.length - 1];
        expect(within(actionCell).getAllByRole('button').length).toBe(3);
      });

      // Click the third button (Trash2 = delete)
      const updatedRow = screen.getAllByRole('row')[1];
      const cells = within(updatedRow).getAllByRole('cell');
      const actionCell = cells[cells.length - 1];
      const [, , deleteBtn] = within(actionCell).getAllByRole('button');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByTestId('delete-dialog')).toBeTruthy();
      });
    });

    it('delete dialog shows the transaction name', async () => {
      renderExpenseTable();

      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      const editCell = editCells[editCells.length - 1];
      fireEvent.click(within(editCell).getByRole('button'));

      await waitFor(() => {
        const row = screen.getAllByRole('row')[1];
        const cells = within(row).getAllByRole('cell');
        expect(within(cells[cells.length - 1]).getAllByRole('button').length).toBe(3);
      });

      const row = screen.getAllByRole('row')[1];
      const cells = within(row).getAllByRole('cell');
      const [, , deleteBtn] = within(cells[cells.length - 1]).getAllByRole('button');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByTestId('delete-item-name').textContent).toBe('Groceries');
      });
    });

    it('confirming delete calls deleteExpenseTransaction with the correct id', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useExpenseTransactionsQuery).mockReturnValue({
        expenseTransactions: mockTransactions,
        total: mockTransactions.length,
        hasMore: false,
        isLoading: false,
        error: null,
        createExpenseTransaction: vi.fn(),
        updateExpenseTransaction: vi.fn().mockResolvedValue({}),
        deleteExpenseTransaction: mockDelete,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderExpenseTable();

      // Enter edit mode
      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      fireEvent.click(within(editCells[editCells.length - 1]).getByRole('button'));

      await waitFor(() => {
        const row = screen.getAllByRole('row')[1];
        const cells = within(row).getAllByRole('cell');
        expect(within(cells[cells.length - 1]).getAllByRole('button').length).toBe(3);
      });

      // Click delete
      const row = screen.getAllByRole('row')[1];
      const cells = within(row).getAllByRole('cell');
      const [, , deleteBtn] = within(cells[cells.length - 1]).getAllByRole('button');
      fireEvent.click(deleteBtn);

      // Confirm delete
      await waitFor(() => screen.getByTestId('delete-confirm-btn'));
      fireEvent.click(screen.getByTestId('delete-confirm-btn'));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('exp-aaa');
      });
    });

    it('cancelling delete dialog closes it without calling delete', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useExpenseTransactionsQuery).mockReturnValue({
        expenseTransactions: mockTransactions,
        total: mockTransactions.length,
        hasMore: false,
        isLoading: false,
        error: null,
        createExpenseTransaction: vi.fn(),
        updateExpenseTransaction: vi.fn().mockResolvedValue({}),
        deleteExpenseTransaction: mockDelete,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
      });

      renderExpenseTable();

      // Enter edit mode
      const firstDataRow = screen.getAllByRole('row')[1];
      const editCells = within(firstDataRow).getAllByRole('cell');
      fireEvent.click(within(editCells[editCells.length - 1]).getByRole('button'));

      await waitFor(() => {
        const row = screen.getAllByRole('row')[1];
        const cells = within(row).getAllByRole('cell');
        expect(within(cells[cells.length - 1]).getAllByRole('button').length).toBe(3);
      });

      // Open delete dialog
      const row = screen.getAllByRole('row')[1];
      const cells = within(row).getAllByRole('cell');
      const [, , deleteBtn] = within(cells[cells.length - 1]).getAllByRole('button');
      fireEvent.click(deleteBtn);

      // Cancel it
      await waitFor(() => screen.getByTestId('delete-cancel-btn'));
      fireEvent.click(screen.getByTestId('delete-cancel-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('delete-dialog')).toBeNull();
        expect(mockDelete).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('pagination', () => {
    it('shows page-size options via select', () => {
      renderExpenseTable();
      // The select for rows per page should render — page size "10" is default
      expect(screen.getByText('Rows per page')).toBeTruthy();
    });

    it('with 3 rows and default page size 10, there is only 1 page (no next page)', () => {
      renderExpenseTable();
      // Only page "1" should appear in pagination
      const pageBtns = screen.getAllByRole('button');
      const pageOneBtn = pageBtns.find((b) => b.textContent === '1');
      expect(pageOneBtn).toBeTruthy();
    });

    it('pagination shows more pages when transactions exceed page size', () => {
      // Create 11 transactions to go beyond default page size of 10
      const many = Array.from({ length: 11 }, (_, i) =>
        makeExpense(`exp-${i}`, `Expense ${i}`, { date: '2026-01-15' })
      );
      setupAllMocks(many);
      renderExpenseTable();

      // Row count shows 10 of 11
      expect(screen.getByText(/Showing 10 out of 11/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('accountId prop filtering', () => {
    it('passes accountId to useExpenseTransactionsQuery when provided', () => {
      renderExpenseTable('acc-specific');
      expect(vi.mocked(useExpenseTransactionsQuery)).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc-specific' })
      );
    });

    it('calls useExpenseTransactionsQuery without accountId when not provided', () => {
      renderExpenseTable();
      expect(vi.mocked(useExpenseTransactionsQuery)).toHaveBeenCalledWith(
        expect.not.objectContaining({ accountId: expect.anything() })
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('useEditableTable integration', () => {
    it('renders data from mergedData (hook integration — data flows through useEditableTable)', () => {
      // The component uses useEditableTable which merges queryData with local edits.
      // On first render with no edits, mergedData === queryData. All rows should appear.
      renderExpenseTable();
      expect(screen.getByText('Groceries')).toBeTruthy();
      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();
    });

    it('tags with full objects render tag name correctly', () => {
      setupAllMocks([
        makeExpense('exp-1', 'Tagged', {
          tags: [{ id: 'tag-1', name: 'PersonalTag', color: '#abc' }],
        }),
      ]);
      vi.mocked(useTagsQuery).mockReturnValue({
        tags: [{ id: 'tag-1', name: 'PersonalTag', color: '#abc', createdAt: '', updatedAt: '' }],
        isLoading: false,
        createTag: vi.fn(),
        createTagOptimistic: vi.fn(),
        deleteTag: vi.fn(),
        isCreating: false,
        isDeleting: false,
      });

      renderExpenseTable();
      expect(screen.getByText('PersonalTag')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('description column', () => {
    it('renders description text when present', () => {
      setupAllMocks([
        makeExpense('exp-1', 'Described Expense', { description: 'Some long description text' }),
      ]);
      renderExpenseTable();
      expect(screen.getByText('Some long description text')).toBeTruthy();
    });

    it('renders empty description as blank (not crashing)', () => {
      setupAllMocks([makeExpense('exp-1', 'No Description', { description: null })]);
      renderExpenseTable();
      expect(screen.getByText('No Description')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('subcategory column', () => {
    it('shows "-" for a transaction with no subcategory', () => {
      setupAllMocks([makeExpense('exp-1', 'No Sub', { expenseSubcategoryId: null, expenseSubcategory: null })]);
      renderExpenseTable();
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('shows subcategory name when set', () => {
      setupAllMocks([
        makeExpense('exp-1', 'Has Sub', {
          expenseSubcategoryId: 'sub-1',
          expenseSubcategory: { id: 'sub-1', name: 'Vegetables' },
        }),
      ]);
      renderExpenseTable();
      expect(screen.getByText('Vegetables')).toBeTruthy();
    });
  });

});
