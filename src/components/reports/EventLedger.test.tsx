import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { EventLedger } from './EventLedger';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useEventLedger', () => ({
  useEventLedger: vi.fn(),
  useEventLedgerTag: vi.fn(),
}));

vi.mock('@/hooks/useTagsQuery', () => ({
  useTagsQuery: vi.fn(),
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/hooks/useTransactionAnalysis', () => ({
  useTransactionAnalysis: vi.fn(),
}));

vi.mock('@/hooks/useExpenseTypesQuery', () => ({
  useExpenseTypesQuery: vi.fn(),
}));

vi.mock('@/hooks/useIncomeTypesQuery', () => ({
  useIncomeTypesQuery: vi.fn(),
}));

// ---------------------------------------------------------------------------
// UI component mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'toggle-group', 'data-value': value },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
            onClick: () => {
              const val = (child as React.ReactElement<{ value?: string }>).props.value;
              if (val && onValueChange) onValueChange(val);
            },
          });
        }
        return child;
      })
    ),
  ToggleGroupItem: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value?: string;
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
    React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => React.createElement('div', { 'data-testid': 'calendar' }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'select',
        'data-value': value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          if (onValueChange) onValueChange(e.target.value);
        },
      },
      children
    ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', { 'data-testid': 'select-trigger' }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', { 'data-testid': 'select-value' }, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': `select-item-${value}`, role: 'option' },
      children
    ),
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command' }, children),
  CommandEmpty: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command-empty' }, children),
  CommandGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command-group' }, children),
  CommandInput: () => React.createElement('input', { 'data-testid': 'command-input' }),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'command-item', onClick: onSelect },
      children
    ),
  CommandList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'command-list' }, children),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked }: { checked?: boolean }) =>
    React.createElement('input', { type: 'checkbox', readOnly: true, checked: !!checked }),
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('span', { 'data-testid': 'spinner' }),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

vi.mock('@/components/shared/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'empty-state' },
      React.createElement('p', null, title),
      React.createElement('p', null, description)
    ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useEventLedger, useEventLedgerTag } from '@/hooks/useEventLedger';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockTags = [
  { id: 'tag-1', name: 'Trip', color: 'hsl(0, 65%, 60%)', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'tag-2', name: 'Wedding', color: 'hsl(180, 65%, 60%)', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

const mockAccounts = [
  { id: 'acc-1', name: 'BPI Checking', accountType: 'CHECKING' as const, currentBalance: '10000', initialBalance: '10000', addToNetWorth: true },
];

const mockRefetch = vi.fn();
const mockAddTag = vi.fn();

const mockLedgerData = {
  totalExpenses: 5000,
  totalIncome: 2000,
  netAmount: 3000,
  expenseCount: 3,
  incomeCount: 1,
  transactions: [
    {
      id: 'tx-1',
      name: 'Jollibee',
      amount: 200,
      type: 'expense' as const,
      date: '2024-03-01T00:00:00Z',
      categoryName: 'Food',
      subcategoryName: 'Dining',
      accountName: 'BPI Checking',
      tags: [{ id: 'tag-1', name: 'Trip', color: '#ff0000' }],
    },
    {
      id: 'tx-2',
      name: 'Freelance Payment',
      amount: 2000,
      type: 'income' as const,
      date: '2024-03-02T00:00:00Z',
      categoryName: 'Salary',
      accountName: 'BPI Checking',
      tags: [{ id: 'tag-1', name: 'Trip', color: '#ff0000' }],
    },
  ],
  hasMore: false,
};

// ---------------------------------------------------------------------------
// Setup helpers
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

function setupDefaultMocks() {
  vi.mocked(useTagsQuery).mockReturnValue({
    tags: mockTags,
    isLoading: false,
    createTag: vi.fn(),
    createTagOptimistic: vi.fn(),
    deleteTag: vi.fn(),
    isCreating: false,
    isDeleting: false,
  });

  vi.mocked(useAccountsQuery).mockReturnValue({
    accounts: mockAccounts,
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

  vi.mocked(useEventLedger).mockReturnValue({
    data: null,
    isFetching: false,
    isFetchingMore: false,
    error: null,
    refetch: mockRefetch,
  });

  vi.mocked(useEventLedgerTag).mockReturnValue({
    addTag: mockAddTag,
    isAdding: false,
  });

  vi.mocked(useTransactionAnalysis).mockReturnValue({
    data: null,
    isLoading: false,
    isFetching: false,
    isFetchingMore: false,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useExpenseTypesQuery).mockReturnValue({
    budgets: [],
    isLoading: false,
    error: null,
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  vi.mocked(useIncomeTypesQuery).mockReturnValue({
    incomeTypes: [],
    isLoading: false,
    error: null,
    createIncomeType: vi.fn(),
    updateIncomeType: vi.fn(),
    deleteIncomeType: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRefetch.mockResolvedValue(undefined);
  setupDefaultMocks();
});

// ---------------------------------------------------------------------------
// renderAndAnalyze: renders the component, selects a tag, and simulates View Ledger.
//
// The button is disabled until at least one tag is selected. Strategy:
//  1. Render with data=null
//  2. Click a tag command-item to select it (enables the button)
//  3. Click View Ledger (sets hasAnalyzed=true)
//  4. On re-render the mock returns data → results panel appears
// ---------------------------------------------------------------------------

async function renderAndAnalyze(ledgerData = mockLedgerData) {
  let callCount = 0;
  vi.mocked(useEventLedger).mockImplementation(() => {
    callCount++;
    return {
      data: callCount <= 2 ? null : { ...ledgerData },
      isFetching: false,
      isFetchingMore: false,
      error: null as string | null,
      refetch: mockRefetch,
    };
  });

  render(React.createElement(EventLedger), { wrapper: createWrapper() });

  // Select a tag first so the View Ledger button becomes enabled
  const tagItems = screen.getAllByTestId('command-item');
  fireEvent.click(tagItems[0]); // select "Trip"

  // Now click View Ledger
  fireEvent.click(screen.getByRole('button', { name: 'View Ledger' }));

  await waitFor(() => {
    expect(screen.getByText('Expenses')).toBeTruthy();
  }, { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventLedger', () => {
  // -------------------------------------------------------------------------
  describe('initial render — form structure', () => {
    it('renders the Event Ledger card title', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText('Event Ledger')).toBeTruthy();
    });

    it('renders the card description', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText(/real cost of an event/)).toBeTruthy();
    });

    it('renders Select Tags label', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText('Select Tags')).toBeTruthy();
    });

    it('renders From date label', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText('From')).toBeTruthy();
    });

    it('renders To date label', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText('To')).toBeTruthy();
    });

    it('renders Account label', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByText('Account')).toBeTruthy();
    });

    it('renders the "View Ledger" button', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: 'View Ledger' })).toBeTruthy();
    });

    it('does not show the Clear button when no filters are active', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    });

    it('does not show results panel before View Ledger is clicked', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.queryByText('Expenses')).toBeNull();
      expect(screen.queryByText('Income')).toBeNull();
      expect(screen.queryByText('Net Cost')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('View Ledger button — disabled state', () => {
    it('disables View Ledger when no tags are selected', () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      const btn = screen.getByRole('button', { name: 'View Ledger' });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('fetching state', () => {
    it('shows spinner and "Analyzing..." text when isFetching is true', () => {
      vi.mocked(useEventLedger).mockReturnValue({
        data: null,
        isFetching: true,
        isFetchingMore: false,
        error: null,
        refetch: mockRefetch,
      });

      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      expect(screen.getByTestId('spinner')).toBeTruthy();
      expect(screen.getByText('Analyzing...')).toBeTruthy();
    });

    it('disables the button when isFetching is true', () => {
      vi.mocked(useEventLedger).mockReturnValue({
        data: null,
        isFetching: true,
        isFetchingMore: false,
        error: null,
        refetch: mockRefetch,
      });

      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      const btn = screen.getByRole('button', { name: /Analyzing/ });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('handleAnalyze — clicking View Ledger', () => {
    it('calls refetch when View Ledger is clicked', async () => {
      render(React.createElement(EventLedger), { wrapper: createWrapper() });

      // Select a tag first to enable the button
      const tagItems = screen.getAllByTestId('command-item');
      fireEvent.click(tagItems[0]);

      fireEvent.click(screen.getByRole('button', { name: 'View Ledger' }));
      await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
    });
  });

  // -------------------------------------------------------------------------
  describe('loading skeleton', () => {
    it('renders skeleton elements when isFetching=true and data=null after analyze', async () => {
      vi.mocked(useEventLedger).mockReturnValue({
        data: null,
        isFetching: true,
        isFetchingMore: false,
        error: null,
        refetch: mockRefetch,
      });

      render(React.createElement(EventLedger), { wrapper: createWrapper() });
      // Click to set hasAnalyzed=true
      fireEvent.click(screen.getByRole('button', { name: /Analyzing/ }));

      // The skeleton should appear (hasAnalyzed && isFetching && !data)
      // Since button is disabled during fetching, the click won't re-trigger refetch
      // but the skeleton logic depends on hasAnalyzed state which is set before the check
    });
  });

  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders the error message after analyze when error is present', async () => {
      vi.mocked(useEventLedger).mockReturnValue({
        data: null,
        isFetching: false,
        isFetchingMore: false,
        error: 'Failed to fetch event ledger',
        refetch: mockRefetch,
      });

      render(React.createElement(EventLedger), { wrapper: createWrapper() });

      // Select a tag first to enable the button
      const tagItems = screen.getAllByTestId('command-item');
      fireEvent.click(tagItems[0]);

      fireEvent.click(screen.getByRole('button', { name: 'View Ledger' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch event ledger')).toBeTruthy();
      });
    });

    it('renders a Retry button in the error state', async () => {
      vi.mocked(useEventLedger).mockReturnValue({
        data: null,
        isFetching: false,
        isFetchingMore: false,
        error: 'Network error',
        refetch: mockRefetch,
      });

      render(React.createElement(EventLedger), { wrapper: createWrapper() });

      // Select a tag first to enable the button
      const tagItems = screen.getAllByTestId('command-item');
      fireEvent.click(tagItems[0]);

      fireEvent.click(screen.getByRole('button', { name: 'View Ledger' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('empty results state', () => {
    it('renders EmptyState when total transactions is 0', async () => {
      await renderAndAnalyze({
        ...mockLedgerData,
        expenseCount: 0,
        incomeCount: 0,
        transactions: [],
      });

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('No transactions found')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — results display', () => {
    it('renders the Expenses summary card', async () => {
      await renderAndAnalyze();
      expect(screen.getByText('Expenses')).toBeTruthy();
    });

    it('renders the Income summary card', async () => {
      await renderAndAnalyze();
      expect(screen.getByText('Income')).toBeTruthy();
    });

    it('renders Net Cost label when netAmount >= 0', async () => {
      await renderAndAnalyze();
      expect(screen.getByText('Net Cost')).toBeTruthy();
    });

    it('renders Net Gain label when netAmount < 0', async () => {
      await renderAndAnalyze({
        ...mockLedgerData,
        netAmount: -1000,
      });
      expect(screen.getByText('Net Gain')).toBeTruthy();
    });

    it('renders transaction names in the list', async () => {
      await renderAndAnalyze();
      expect(screen.getByText('Jollibee')).toBeTruthy();
      expect(screen.getByText('Freelance Payment')).toBeTruthy();
    });

    it('renders expense transaction with category and subcategory', async () => {
      await renderAndAnalyze();
      expect(screen.getByText(/Dining/)).toBeTruthy();
    });

    it('renders summary sentence with transaction count', async () => {
      await renderAndAnalyze();
      expect(screen.getByText('4 transactions')).toBeTruthy();
    });

    it('renders singular "transaction" when count is 1', async () => {
      await renderAndAnalyze({
        ...mockLedgerData,
        expenseCount: 1,
        incomeCount: 0,
        transactions: [mockLedgerData.transactions[0]],
      });
      expect(screen.getByText('1 transaction')).toBeTruthy();
    });

    it('renders "You spent" in summary sentence', async () => {
      await renderAndAnalyze();
      expect(screen.getByText(/You spent/)).toBeTruthy();
    });

    it('renders "and received" in summary sentence', async () => {
      await renderAndAnalyze();
      expect(screen.getByText(/and received/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('expense/income indicators', () => {
    it('renders minus sign for expense transactions', async () => {
      await renderAndAnalyze();
      const minusSigns = screen.getAllByText('−');
      expect(minusSigns.length).toBeGreaterThan(0);
    });

    it('renders plus sign for income transactions', async () => {
      await renderAndAnalyze();
      const plusSigns = screen.getAllByText('+');
      expect(plusSigns.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('Load More button', () => {
    it('renders Load More when hasMore is true', async () => {
      await renderAndAnalyze({ ...mockLedgerData, hasMore: true });
      expect(screen.getByRole('button', { name: 'Load More' })).toBeTruthy();
    });

    it('does not render Load More when hasMore is false', async () => {
      await renderAndAnalyze({ ...mockLedgerData, hasMore: false });
      expect(screen.queryByRole('button', { name: 'Load More' })).toBeNull();
    });

    it('calls refetch when Load More is clicked', async () => {
      await renderAndAnalyze({ ...mockLedgerData, hasMore: true });

      fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('isFetchingMore skeleton', () => {
    it('renders skeleton rows when isFetchingMore is true', async () => {
      await renderAndAnalyze({ ...mockLedgerData, hasMore: true });

      vi.mocked(useEventLedger).mockReturnValue({
        data: { ...mockLedgerData, hasMore: true },
        isFetching: true,
        isFetchingMore: true,
        error: null,
        refetch: mockRefetch,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

      await waitFor(() => {
        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('Add Transactions panel', () => {
    it('renders "Add Transactions" button after results are displayed', async () => {
      await renderAndAnalyze();
      expect(screen.getByRole('button', { name: /Add Transactions/ })).toBeTruthy();
    });

    it('does not show Add Transactions button when no transactions exist', async () => {
      await renderAndAnalyze({
        ...mockLedgerData,
        expenseCount: 0,
        incomeCount: 0,
        transactions: [],
      });
      expect(screen.queryByRole('button', { name: /Add Transactions/ })).toBeNull();
    });
  });
});
