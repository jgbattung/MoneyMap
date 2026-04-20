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

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('InstallmentCard', () => {
  describe('basic rendering', () => {
    it('renders the installment name', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment() }));
      expect(screen.getByText('iPhone 16')).toBeTruthy();
    });

    it('renders the expense type name', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment() }));
      expect(screen.getByText('Electronics')).toBeTruthy();
    });

    it('renders expense type with subcategory when subcategory is present', () => {
      render(
        React.createElement(InstallmentCard, {
          installment: makeInstallment({ expenseSubcategory: { id: 'sub-1', name: 'Phones' } }),
        })
      );
      expect(screen.getByText('Electronics > Phones')).toBeTruthy();
    });

    it('renders expense type only when subcategory is null', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment({ expenseSubcategory: null }) }));
      expect(screen.getByText('Electronics')).toBeTruthy();
      expect(screen.queryByText('>')).toBeNull();
    });

    it('renders the monthly amount', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment({ monthlyAmount: '5000.00' }) }));
      expect(screen.getByText('₱5,000.00')).toBeTruthy();
    });

    it('renders "—" for monthly when monthlyAmount is null', () => {
      const { container } = render(
        React.createElement(InstallmentCard, { installment: makeInstallment({ monthlyAmount: null }) })
      );
      expect(container.textContent).toContain('₱—');
    });

    it('renders duration in months', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment({ installmentDuration: 12 }) }));
      expect(screen.getByText('12 months')).toBeTruthy();
    });

    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(React.createElement(InstallmentCard, { installment: makeInstallment() }));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });

    it('does NOT render Edit or Delete buttons', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment() }));
      expect(screen.queryByRole('button', { name: 'Edit installment' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete installment' })).toBeNull();
    });
  });

  describe('progress', () => {
    it('renders progressbar with correct aria attributes', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(React.createElement(InstallmentCard, { installment: inst }));
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('8');
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('12');
    });

    it('renders progress text as "paid of duration"', () => {
      const inst = makeInstallment({ installmentDuration: 12, remainingInstallments: 4 });
      render(React.createElement(InstallmentCard, { installment: inst }));
      expect(screen.getByText('8 of 12')).toBeTruthy();
    });
  });

  describe('status badge', () => {
    it('renders "Active" badge for ACTIVE status', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment({ installmentStatus: 'ACTIVE' }) }));
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders "Completed" badge for COMPLETED status', () => {
      render(React.createElement(InstallmentCard, { installment: makeInstallment({ installmentStatus: 'COMPLETED' }) }));
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
      render(React.createElement(InstallmentCard, { installment: inst }));
      expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    });

    it('shows lastProcessedDate + 30 days as next payment', () => {
      const inst = makeInstallment({
        installmentStatus: 'ACTIVE',
        lastProcessedDate: '2024-01-15',
        installmentStartDate: '2024-01-15',
      });
      render(React.createElement(InstallmentCard, { installment: inst }));
      expect(screen.getByText('Feb 14, 2024')).toBeTruthy();
    });

    it('shows "—" for next payment when COMPLETED', () => {
      const inst = makeInstallment({
        installmentStatus: 'COMPLETED',
        lastProcessedDate: '2024-12-15',
        installmentStartDate: '2024-01-15',
      });
      render(React.createElement(InstallmentCard, { installment: inst }));
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('click interaction', () => {
    it('calls onClick when the card root is clicked', () => {
      const onClick = vi.fn();
      const { container } = render(
        React.createElement(InstallmentCard, { installment: makeInstallment({ id: 'inst-abc' }), onClick })
      );
      const root = container.firstChild as HTMLElement;
      fireEvent.click(root);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onClick is not provided', () => {
      const { container } = render(React.createElement(InstallmentCard, { installment: makeInstallment() }));
      const root = container.firstChild as HTMLElement;
      expect(() => fireEvent.click(root)).not.toThrow();
    });
  });
});
