import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ExpenseCard from './ExpenseCard';

// Mock icons
vi.mock('../icons', () => ({
  Icons: {
    addExpense: ({ _size, className }: { _size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-add-expense', className }),
  },
}));

// Mock Shadcn Badge
vi.mock('../ui/badge', () => ({
  Badge: ({ children, _variant, className }: { children: React.ReactNode; _variant?: string; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ..._rest }: { children: React.ReactNode; className?: string; [key: string]: unknown }) =>
      React.createElement('div', { className }, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const baseProps = {
  id: 'exp-1',
  name: 'Grocery Shopping',
  amount: '2500.00',
  date: '2024-03-10T00:00:00.000Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  expenseType: { id: 'type-1', name: 'Food' },
  isInstallment: false,
  onClick: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseCard', () => {
  describe('rendering — basic content', () => {
    it('renders the expense name', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('Grocery Shopping')).toBeTruthy();
    });

    it('renders the formatted amount', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('2,500.00')).toBeTruthy();
    });

    it('renders the expense type name', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('Food')).toBeTruthy();
    });

    it('renders the account name', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders "PHP" currency label', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('PHP')).toBeTruthy();
    });
  });

  describe('subcategory rendering', () => {
    it('renders expenseType > subcategory when subcategory is present', () => {
      render(
        React.createElement(ExpenseCard, {
          ...baseProps,
          expenseSubcategory: { id: 'sub-1', name: 'Vegetables' },
        })
      );
      expect(screen.getByText('Food > Vegetables')).toBeTruthy();
    });

    it('renders expenseType only when subcategory is null', () => {
      render(
        React.createElement(ExpenseCard, {
          ...baseProps,
          expenseSubcategory: null,
        })
      );
      expect(screen.getByText('Food')).toBeTruthy();
    });
  });

  describe('date formatting', () => {
    it('formats date as "MMM d, yyyy" for non-installment', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.getByText('Mar 10, 2024')).toBeTruthy();
    });

    it('uses installmentStartDate when isInstallment is true', () => {
      render(
        React.createElement(ExpenseCard, {
          ...baseProps,
          isInstallment: true,
          installmentStartDate: '2024-01-15T00:00:00.000Z',
          installmentDuration: 12,
          remainingInstallments: 10,
          monthlyAmount: '208.33',
        })
      );
      expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    });
  });

  describe('installment badge', () => {
    it('does not render Installment badge for non-installment expenses', () => {
      render(React.createElement(ExpenseCard, baseProps));
      expect(screen.queryByTestId('badge')).toBeNull();
    });

    it('renders Installment badge when isInstallment is true', () => {
      render(
        React.createElement(ExpenseCard, {
          ...baseProps,
          isInstallment: true,
          installmentStartDate: '2024-01-15T00:00:00.000Z',
          installmentDuration: 12,
          remainingInstallments: 10,
          monthlyAmount: '208.33',
        })
      );
      expect(screen.getByTestId('badge')).toBeTruthy();
      expect(screen.getByText('Installment')).toBeTruthy();
    });
  });

  describe('installment details toggle', () => {
    const installmentProps = {
      ...baseProps,
      isInstallment: true,
      installmentStartDate: '2024-01-15T00:00:00.000Z',
      installmentDuration: 12,
      remainingInstallments: 10,
      monthlyAmount: '208.33',
    };

    it('renders "Installment details" button for installment expenses', () => {
      render(React.createElement(ExpenseCard, installmentProps));
      expect(screen.getByText('Installment details')).toBeTruthy();
    });

    it('shows installment detail panel when "Installment details" is clicked', () => {
      render(React.createElement(ExpenseCard, installmentProps));
      const button = screen.getByText('Installment details').closest('button') as HTMLElement;
      fireEvent.click(button);
      expect(screen.getByText('Start Date:')).toBeTruthy();
      expect(screen.getByText('Remaining Installments:')).toBeTruthy();
    });

    it('shows paid/total installment progress', () => {
      render(React.createElement(ExpenseCard, installmentProps));
      const button = screen.getByText('Installment details').closest('button') as HTMLElement;
      fireEvent.click(button);
      // paidInstallments = 12 - 10 = 2, total = 12 → "2/12"
      expect(screen.getByText('2/12')).toBeTruthy();
    });

    it('displays monthly amount when isInstallment is true', () => {
      render(React.createElement(ExpenseCard, installmentProps));
      // monthly amount formatted: 208.33
      expect(screen.getByText('208.33')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(React.createElement(ExpenseCard, { ...baseProps, onClick }));
      const card = screen.getByText('Grocery Shopping').closest('div[class*="money-map"]') as HTMLElement;
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('money-map-card-interactive class', () => {
    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(React.createElement(ExpenseCard, baseProps));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });
});
