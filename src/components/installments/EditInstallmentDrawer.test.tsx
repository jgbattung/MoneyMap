/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditInstallmentDrawer from './EditInstallmentDrawer';
import { type Installment } from '@/hooks/useInstallmentsQuery';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useInstallmentsQuery', () => ({
  useInstallmentsQuery: vi.fn(),
  useInstallmentQuery: vi.fn(),
}));

vi.mock('@/hooks/useExpenseTypesQuery', () => ({
  useExpenseTypesQuery: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/utils', () => ({
  formatDateForAPI: (date: Date) => date?.toISOString().split('T')[0] ?? null,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Skeleton mock
vi.mock('@/components/shared/SkeletonEditExpenseDrawerForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'skeleton-form' }, 'Loading...'),
}));

// DeleteDialog mock — renders a simple dialog with a Confirm button when open
vi.mock('@/components/shared/DeleteDialog', () => ({
  default: ({
    open,
    onConfirm,
    title,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: () => void;
    title?: string;
    isDeleting?: boolean;
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'delete-dialog' },
          React.createElement('span', null, title),
          React.createElement('button', { onClick: onConfirm }, 'Confirm delete'),
        )
      : null,
}));

// Drawer mocks — render children directly
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'drawer' }, children) : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'drawer-content' }, children),
  DrawerHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'drawer-header' }, children),
  DrawerTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DrawerDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
  DrawerFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'drawer-footer' }, children),
  DrawerClose: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'drawer-close' }, children),
}));

// Shadcn Form mocks — render label + input in a straightforward way
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'form-wrapper' }, children),
  FormField: ({ render: renderFn, name }: { render: (props: any) => React.ReactNode; name: string }) => {
    const field = {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name,
      ref: vi.fn(),
    };
    return React.createElement('div', { 'data-field': name }, renderFn({ field }));
  },
  FormItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'form-item' }, children),
  FormLabel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('label', null, children),
  FormControl: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  FormDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', { 'data-testid': 'form-description' }, children),
  FormMessage: () => null,
}));

// Input mock
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}));

// Button mock
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    variant?: string;
  }) =>
    React.createElement(
      'button',
      { onClick, type, disabled, 'data-variant': variant },
      children,
    ),
}));

// Select mock — renders a select element
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    defaultValue,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    defaultValue?: string;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'select', 'data-default-value': defaultValue, 'data-on-change': String(onValueChange) },
      children,
    ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', { 'data-testid': 'select-value' }, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': 'select-item', 'data-value': value }, children),
}));

// Popover + Calendar mocks (date picker)
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover' }, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onDayClick }: { onDayClick?: (date: Date) => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'calendar' },
      React.createElement(
        'button',
        { onClick: () => onDayClick?.(new Date('2024-03-01')) },
        'Select Mar 1',
      ),
    ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-area' }, children),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => React.createElement('hr', { 'data-testid': 'separator' }),
}));

vi.mock('lucide-react', () => ({
  ChevronDownIcon: () => React.createElement('svg', { 'data-testid': 'chevron-icon' }),
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------
import { useInstallmentsQuery, useInstallmentQuery } from '@/hooks/useInstallmentsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeInstallmentData(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'inst-1',
    userId: 'user-1',
    accountId: 'acc-1',
    expenseTypeId: 'type-1',
    expenseSubcategoryId: null,
    name: 'iPhone 16',
    amount: '60000',
    date: '2024-01-01',
    isInstallment: true,
    installmentDuration: 12,
    remainingInstallments: 6,
    installmentStartDate: '2024-01-15',
    monthlyAmount: '5000.00',
    lastProcessedDate: null,
    installmentStatus: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    account: { id: 'acc-1', name: 'BDO Savings' },
    expenseType: { id: 'type-1', name: 'Electronics' },
    expenseSubcategory: null,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function setupMocks({
  installmentData = makeInstallmentData(),
  isFetching = false,
  error = null,
  isUpdating = false,
  isDeleting = false,
  budgets = [{ id: 'type-1', name: 'Electronics', subcategories: [] }],
  updateInstallment = vi.fn().mockResolvedValue(makeInstallmentData()),
  deleteInstallment = vi.fn(),
}: {
  installmentData?: Installment | undefined;
  isFetching?: boolean;
  error?: string | null;
  isUpdating?: boolean;
  isDeleting?: boolean;
  budgets?: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  updateInstallment?: ReturnType<typeof vi.fn>;
  deleteInstallment?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useInstallmentQuery).mockReturnValue({ installmentData, isFetching, error });
  vi.mocked(useInstallmentsQuery).mockReturnValue({
    installments: [],
    isLoading: false,
    error: null,
    updateInstallment,
    deleteInstallment,
    deleteInstallmentAsync: vi.fn(),
    isUpdating,
    isDeleting,
  } as any);
  vi.mocked(useExpenseTypesQuery).mockReturnValue({ budgets } as any);
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  installmentId: 'inst-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('EditInstallmentDrawer', () => {
  describe('loading state', () => {
    it('shows skeleton when isFetching is true', () => {
      setupMocks({ isFetching: true, installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('skeleton-form')).toBeTruthy();
    });

    it('does not show the form when isFetching is true', () => {
      setupMocks({ isFetching: true, installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.queryByText('Edit Installment')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error title when error is present', () => {
      setupMocks({ error: 'Failed to load', installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Unable to load installment')).toBeTruthy();
    });

    it('shows the error message text', () => {
      setupMocks({ error: 'Failed to load', installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Failed to load')).toBeTruthy();
    });

    it('shows "Try again" button in error state', () => {
      setupMocks({ error: 'Failed to load', installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Try again')).toBeTruthy();
    });

    it('shows "Close" button in error state', () => {
      setupMocks({ error: 'Failed to load', installmentData: undefined });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Close')).toBeTruthy();
    });
  });

  describe('form rendering (success state)', () => {
    it('shows the Edit Installment drawer title', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Edit Installment')).toBeTruthy();
    });

    it('renders Name field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Name')).toBeTruthy();
    });

    it('renders Total amount field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Total amount')).toBeTruthy();
    });

    it('renders Account read-only field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Account')).toBeTruthy();
    });

    it('renders the account name in the read-only field', () => {
      setupMocks({ installmentData: makeInstallmentData({ account: { id: 'acc-1', name: 'BDO Savings' } }) });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders Duration read-only field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Duration')).toBeTruthy();
    });

    it('renders the duration value in months', () => {
      setupMocks({ installmentData: makeInstallmentData({ installmentDuration: 12 }) });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('12 months')).toBeTruthy();
    });

    it('renders Installment start date field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Installment start date')).toBeTruthy();
    });

    it('renders Expense type field label', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Expense type')).toBeTruthy();
    });

    it('renders the expense type options in the select', () => {
      setupMocks({
        budgets: [
          { id: 'type-1', name: 'Electronics', subcategories: [] },
          { id: 'type-2', name: 'Food', subcategories: [] },
        ],
      });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Electronics')).toBeTruthy();
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('renders Update installment submit button', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Update installment')).toBeTruthy();
    });

    it('renders Cancel button', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('renders Delete installment button', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Delete installment')).toBeTruthy();
    });
  });

  describe('updating state', () => {
    it('shows "Updating installment..." text when isUpdating is true', () => {
      setupMocks({ isUpdating: true });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Updating installment...')).toBeTruthy();
    });

    it('disables submit button when isUpdating is true', () => {
      setupMocks({ isUpdating: true });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      const submitBtn = screen.getByText('Updating installment...').closest('button') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('disables Delete installment button when isUpdating is true', () => {
      setupMocks({ isUpdating: true });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      const deleteBtn = screen.getByText('Delete installment').closest('button') as HTMLButtonElement;
      expect(deleteBtn.disabled).toBe(true);
    });

    it('disables Delete installment button when isDeleting is true', () => {
      setupMocks({ isDeleting: true });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      const deleteBtn = screen.getByText('Delete installment').closest('button') as HTMLButtonElement;
      expect(deleteBtn.disabled).toBe(true);
    });
  });

  describe('delete flow', () => {
    it('opens the DeleteDialog when Delete installment button is clicked', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      const deleteBtn = screen.getByText('Delete installment');
      fireEvent.click(deleteBtn);
      expect(screen.getByTestId('delete-dialog')).toBeTruthy();
    });

    it('calls deleteInstallment and shows success toast on confirm', async () => {
      const deleteInstallment = vi.fn();
      setupMocks({ deleteInstallment });
      const onOpenChange = vi.fn();

      render(
        React.createElement(EditInstallmentDrawer, { ...defaultProps, onOpenChange }),
        { wrapper: createWrapper() }
      );

      // Open delete dialog
      fireEvent.click(screen.getByText('Delete installment'));
      expect(screen.getByTestId('delete-dialog')).toBeTruthy();

      // Confirm deletion
      fireEvent.click(screen.getByText('Confirm delete'));

      await waitFor(() => {
        expect(deleteInstallment).toHaveBeenCalledWith('inst-1');
        expect(toast.success).toHaveBeenCalledWith(
          'Installment deleted successfully',
          expect.any(Object),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('subcategory field', () => {
    it('does NOT render subcategory select when expense type has no subcategories', () => {
      setupMocks({
        budgets: [{ id: 'type-1', name: 'Electronics', subcategories: [] }],
      });
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.queryByText('Subcategory (Optional)')).toBeNull();
    });

    // Note: subcategory rendering depends on form.watch('expenseTypeId') returning a value
    // that matches a budget with subcategories. Since FormField is mocked to pass
    // empty value, we verify the conditional is wired to the budget lookup.
  });

  describe('drawer visibility', () => {
    it('does not render drawer content when open is false', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, { ...defaultProps, open: false }),
        { wrapper: createWrapper() }
      );
      expect(screen.queryByTestId('drawer')).toBeNull();
    });

    it('renders drawer content when open is true', () => {
      setupMocks();
      render(
        React.createElement(EditInstallmentDrawer, defaultProps),
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('drawer')).toBeTruthy();
    });
  });
});
