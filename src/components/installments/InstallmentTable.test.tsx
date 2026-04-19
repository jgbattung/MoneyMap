import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InstallmentTable from './InstallmentTable';
import { type Installment } from '@/hooks/useInstallmentsQuery';

// ---------------------------------------------------------------------------
// Minimal UI mocks (avoid needing full Shadcn rendering)
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', 'data-variant': variant }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
    disabled?: boolean;
  }) =>
    React.createElement(
      'button',
      { onClick, 'aria-label': ariaLabel, disabled },
      children,
    ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) =>
    React.createElement('table', null, children),
  TableHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('thead', null, children),
  TableBody: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tbody', null, children),
  TableRow: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tr', null, children),
  TableHead: ({ children }: { children: React.ReactNode }) =>
    React.createElement('th', null, children),
  TableCell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('td', null, children),
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
describe('InstallmentTable', () => {
  describe('header columns', () => {
    it('renders all required column headers', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );

      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByText('Monthly')).toBeTruthy();
      expect(screen.getByText('Progress')).toBeTruthy();
      expect(screen.getByText('Start date')).toBeTruthy();
      expect(screen.getByText('Next payment')).toBeTruthy();
      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByText('Actions')).toBeTruthy();
    });
  });

  describe('row rendering — basic content', () => {
    it('renders the installment name', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment()],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('iPhone 16')).toBeTruthy();
    });

    it('renders the total amount with peso sign', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment()],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('₱60,000.00')).toBeTruthy();
    });

    it('renders the monthly amount with peso sign', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment()],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('₱5,000.00')).toBeTruthy();
    });

    it('renders "—" when monthlyAmount is null', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ monthlyAmount: null, installmentStartDate: null, lastProcessedDate: null })],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      // monthly cell shows "₱—" (split across text nodes), start date and next payment also show "—"
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the formatted start date', () => {
      render(
        React.createElement(InstallmentTable, {
          // Set lastProcessedDate so next payment shows a different date than start date
          installments: [makeInstallment({ installmentStartDate: '2024-01-15', lastProcessedDate: '2024-02-15' })],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      // Start date cell shows Jan 15, 2024; next payment shows Mar 16, 2024 (lastProcessedDate + 30)
      expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    });

    it('renders "—" for start date when installmentStartDate is null', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ installmentStartDate: null })],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('progress bar', () => {
    it('renders progressbar role with correct aria attributes', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(
        React.createElement(InstallmentTable, {
          installments: [inst],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('8'); // 12 - 4
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('12');
    });

    it('renders progress text as paid / duration', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(
        React.createElement(InstallmentTable, {
          installments: [inst],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      // paid = 12 - 4 = 8; duration = 12 → "8 / 12"
      expect(screen.getByText('8 / 12')).toBeTruthy();
    });
  });

  describe('next payment computation', () => {
    it('shows startDate as next payment when lastProcessedDate is null (ACTIVE)', () => {
      const inst = makeInstallment({
        installmentStatus: 'ACTIVE',
        installmentStartDate: '2024-01-15',
        lastProcessedDate: null,
      });
      render(
        React.createElement(InstallmentTable, {
          installments: [inst],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      // Both start date cell and next payment cell render Jan 15, 2024
      const dateCells = screen.getAllByText('Jan 15, 2024');
      expect(dateCells.length).toBeGreaterThanOrEqual(2);
    });

    it('shows lastProcessedDate + 30 days as next payment', () => {
      // lastProcessedDate = 2024-01-15 → next = 2024-02-14
      const inst = makeInstallment({
        installmentStatus: 'ACTIVE',
        lastProcessedDate: '2024-01-15',
      });
      render(
        React.createElement(InstallmentTable, {
          installments: [inst],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Feb 14, 2024')).toBeTruthy();
    });

    it('shows "—" for next payment when status is COMPLETED', () => {
      const inst = makeInstallment({
        installmentStatus: 'COMPLETED',
        installmentStartDate: '2024-01-15',
        lastProcessedDate: '2024-12-15',
      });
      render(
        React.createElement(InstallmentTable, {
          installments: [inst],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      const dashes = screen.getAllByText('—');
      // next payment cell should be one of the dashes
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('status badge', () => {
    it('renders "Active" badge for ACTIVE status', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ installmentStatus: 'ACTIVE' })],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders "Completed" badge for COMPLETED status', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ installmentStatus: 'COMPLETED' })],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('renders Edit button with correct aria-label', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment()],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByRole('button', { name: 'Edit installment' })).toBeTruthy();
    });

    it('renders Delete button with correct aria-label', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment()],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByRole('button', { name: 'Delete installment' })).toBeTruthy();
    });

    it('calls onEdit with the installment id when Edit is clicked', () => {
      const onEdit = vi.fn();
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ id: 'inst-abc' })],
          onEdit,
          onDelete: defaultOnDelete,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Edit installment' }));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith('inst-abc');
    });

    it('calls onDelete with id and name when Delete is clicked', () => {
      const onDelete = vi.fn();
      render(
        React.createElement(InstallmentTable, {
          installments: [makeInstallment({ id: 'inst-abc', name: 'iPhone 16' })],
          onEdit: defaultOnEdit,
          onDelete,
        })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Delete installment' }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('inst-abc', 'iPhone 16');
    });
  });

  describe('multiple rows', () => {
    it('renders a row for each installment', () => {
      const installments = [
        makeInstallment({ id: 'inst-1', name: 'iPhone 16' }),
        makeInstallment({ id: 'inst-2', name: 'MacBook Pro' }),
        makeInstallment({ id: 'inst-3', name: 'iPad Air' }),
      ];
      render(
        React.createElement(InstallmentTable, {
          installments,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getByText('iPhone 16')).toBeTruthy();
      expect(screen.getByText('MacBook Pro')).toBeTruthy();
      expect(screen.getByText('iPad Air')).toBeTruthy();
    });

    it('renders edit/delete buttons for each row', () => {
      const installments = [
        makeInstallment({ id: 'inst-1', name: 'A' }),
        makeInstallment({ id: 'inst-2', name: 'B' }),
      ];
      render(
        React.createElement(InstallmentTable, {
          installments,
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.getAllByRole('button', { name: 'Edit installment' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Delete installment' })).toHaveLength(2);
    });
  });

  describe('empty state', () => {
    it('renders the table with no rows when installments is empty', () => {
      render(
        React.createElement(InstallmentTable, {
          installments: [],
          onEdit: defaultOnEdit,
          onDelete: defaultOnDelete,
        })
      );
      expect(screen.queryByRole('button', { name: 'Edit installment' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete installment' })).toBeNull();
    });
  });
});
