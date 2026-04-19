import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InstallmentCard from './InstallmentCard';
import { type Installment } from '@/hooks/useInstallmentsQuery';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/components/icons', () => ({
  Icons: {
    addExpense: ({ className }: { className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-add-expense', className }),
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', 'data-variant': variant }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    'aria-label'?: string;
  }) =>
    React.createElement('button', { onClick, 'aria-label': ariaLabel }, children),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => React.createElement('svg', { 'data-testid': 'icon-trash' }),
}));

vi.mock('@tabler/icons-react', () => ({
  IconEdit: () => React.createElement('svg', { 'data-testid': 'icon-edit' }),
}));

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------
function makeInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'inst-1',
    userId: 'user-1',
    accountId: 'acc-1',
    expenseTypeId: 'type-1',
    expenseSubcategoryId: null,
    name: 'iPhone 16',
    amount: '60000.00',
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

const defaultOnEdit = vi.fn();
const defaultOnDelete = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('InstallmentCard', () => {
  describe('basic rendering', () => {
    it('renders the installment name', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment(),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('iPhone 16')).toBeTruthy();
    });

    it('renders the expense type name', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment(),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Electronics')).toBeTruthy();
    });

    it('renders expense type with subcategory when subcategory is present', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({
            expenseSubcategory: { id: 'sub-1', name: 'Phones' },
          }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Electronics > Phones')).toBeTruthy();
    });

    it('renders expense type only when subcategory is null', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ expenseSubcategory: null }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Electronics')).toBeTruthy();
      expect(screen.queryByText('>')).toBeNull();
    });

    it('renders the monthly amount', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ monthlyAmount: '5000.00' }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('₱5,000.00')).toBeTruthy();
    });

    it('renders "—" for monthly when monthlyAmount is null', () => {
      const { container } = render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ monthlyAmount: null }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      // The monthly amount renders as "₱—" split across text nodes inside a <span>.
      // Use a regex or container.textContent to assert the dash is present.
      expect(container.textContent).toContain('₱—');
    });

    it('renders duration in months', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ installmentDuration: 12 }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('12 months')).toBeTruthy();
    });

    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment(),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });

  describe('progress', () => {
    it('renders progressbar with correct aria attributes', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(
        React.createElement(InstallmentCard, {
          installment: inst,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('8'); // 12 - 4
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('12');
    });

    it('renders progress text as "paid of duration"', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(
        React.createElement(InstallmentCard, {
          installment: inst,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('8 of 12')).toBeTruthy();
    });
  });

  describe('status badge', () => {
    it('renders "Active" badge for ACTIVE status', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ installmentStatus: 'ACTIVE' }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders "Completed" badge for COMPLETED status', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ installmentStatus: 'COMPLETED' }),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  describe('next payment', () => {
    it('shows installmentStartDate as next payment when lastProcessedDate is null (ACTIVE)', () => {
      const inst = makeInstallment({
        installmentStatus: 'ACTIVE',
        installmentStartDate: '2024-01-15',
        lastProcessedDate: null,
      });
      render(
        React.createElement(InstallmentCard, {
          installment: inst,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    });

    it('shows lastProcessedDate + 30 days as next payment', () => {
      // lastProcessedDate = 2024-01-15 → next payment = 2024-02-14
      const inst = makeInstallment({
        installmentStatus: 'ACTIVE',
        lastProcessedDate: '2024-01-15',
        installmentStartDate: '2024-01-15',
      });
      render(
        React.createElement(InstallmentCard, {
          installment: inst,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Feb 14, 2024')).toBeTruthy();
    });

    it('shows "—" for next payment when COMPLETED', () => {
      const inst = makeInstallment({
        installmentStatus: 'COMPLETED',
        lastProcessedDate: '2024-12-15',
        installmentStartDate: '2024-01-15',
      });
      render(
        React.createElement(InstallmentCard, {
          installment: inst,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('interactions', () => {
    it('calls onEdit when the card root is clicked', () => {
      const onEdit = vi.fn();
      const { container } = render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ id: 'inst-abc' }),
          onEdit,
          onDelete: defaultOnDelete,
        })
      );
      const root = container.firstChild as HTMLElement;
      fireEvent.click(root);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith('inst-abc');
    });

    it('calls onEdit with installment id when Edit button is clicked', () => {
      const onEdit = vi.fn();
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ id: 'inst-abc' }),
          onEdit,
          onDelete: defaultOnDelete,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Edit installment' }));
      expect(onEdit).toHaveBeenCalledWith('inst-abc');
    });

    it('calls onDelete with id and name when Delete button is clicked', () => {
      const onDelete = vi.fn();
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ id: 'inst-abc', name: 'iPhone 16' }),
          onEdit: defaultOnEdit,
          onDelete,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Delete installment' }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('inst-abc', 'iPhone 16');
    });

    it('Edit button click does not bubble up to cause double onEdit call', () => {
      const onEdit = vi.fn();
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ id: 'inst-abc' }),
          onEdit,
          onDelete: defaultOnDelete,
        })
      );
      // e.stopPropagation() is called in the button handler
      // so clicking the Edit button should call onEdit exactly once (from the button),
      // not twice (button + card root propagation)
      fireEvent.click(screen.getByRole('button', { name: 'Edit installment' }));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('Delete button click does not propagate to card root', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ id: 'inst-abc' }),
          onEdit,
          onDelete,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Delete installment' }));
      // onEdit should NOT be called since stopPropagation prevents card click
      expect(onEdit).not.toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('action button aria-labels', () => {
    it('has aria-label "Edit installment" on edit button', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment(),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByRole('button', { name: 'Edit installment' })).toBeTruthy();
    });

    it('has aria-label "Delete installment" on delete button', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment(),
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByRole('button', { name: 'Delete installment' })).toBeTruthy();
    });
  });
});
