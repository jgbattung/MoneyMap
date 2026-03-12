import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CompactTransactionCard from './CompactTransactionCard';

// Tabler icons are SVG — mock to avoid font/SVG issues in happy-dom
vi.mock('@tabler/icons-react', () => ({
  IconArrowDown: () => React.createElement('svg', { 'data-testid': 'icon-arrow-down' }),
  IconArrowUp: () => React.createElement('svg', { 'data-testid': 'icon-arrow-up' }),
  IconArrowRight: () => React.createElement('svg', { 'data-testid': 'icon-arrow-right' }),
}));

const baseProps = {
  id: 'txn-1',
  type: 'EXPENSE' as const,
  name: 'Coffee',
  amount: 150.5,
  date: '2024-03-10',
  category: 'Food',
  account: 'BDO Savings',
  onClick: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CompactTransactionCard', () => {
  describe('rendering — basic content', () => {
    it('renders the transaction name', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      expect(screen.getByText('Coffee')).toBeTruthy();
    });

    it('renders the formatted amount with peso sign', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      expect(screen.getByText(/₱150\.50/)).toBeTruthy();
    });

    it('renders the account name', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders the formatted date', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      // date-fns format: MMM d → "Mar 10"
      expect(screen.getByText('Mar 10')).toBeTruthy();
    });

    it('renders category without subcategory', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      expect(screen.getByText('Food')).toBeTruthy();
    });
  });

  describe('rendering — category with subcategory', () => {
    it('renders category > subcategory when subcategory is provided', () => {
      render(
        React.createElement(CompactTransactionCard, {
          ...baseProps,
          category: 'Food',
          subcategory: 'Drinks',
        })
      );
      expect(screen.getByText('Food > Drinks')).toBeTruthy();
    });

    it('renders category only when subcategory is null', () => {
      render(
        React.createElement(CompactTransactionCard, {
          ...baseProps,
          subcategory: null,
        })
      );
      expect(screen.getByText('Food')).toBeTruthy();
    });
  });

  describe('rendering — transfer account display', () => {
    it('renders account → toAccount for TRANSFER type', () => {
      render(
        React.createElement(CompactTransactionCard, {
          ...baseProps,
          type: 'TRANSFER',
          account: 'BDO Savings',
          toAccount: 'BPI Checking',
        })
      );
      expect(screen.getByText('BDO Savings → BPI Checking')).toBeTruthy();
    });

    it('renders account only when toAccount is not provided', () => {
      render(React.createElement(CompactTransactionCard, baseProps));
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });
  });

  describe('icon rendering by type', () => {
    it('renders arrow-down icon for EXPENSE', () => {
      render(React.createElement(CompactTransactionCard, { ...baseProps, type: 'EXPENSE' }));
      expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();
    });

    it('renders arrow-up icon for INCOME', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'INCOME' })
      );
      expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    });

    it('renders arrow-right icon for TRANSFER', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'TRANSFER' })
      );
      expect(screen.getByTestId('icon-arrow-right')).toBeTruthy();
    });
  });

  describe('color classes by transaction type', () => {
    it('applies text-text-error class to amount for EXPENSE', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'EXPENSE' })
      );
      const amountEl = screen.getByText(/₱150\.50/);
      expect(amountEl.className).toContain('text-text-error');
    });

    it('applies text-text-success class to amount for INCOME', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'INCOME' })
      );
      const amountEl = screen.getByText(/₱150\.50/);
      expect(amountEl.className).toContain('text-text-success');
    });

    it('applies text-neutral-400 class to amount for TRANSFER', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'TRANSFER' })
      );
      const amountEl = screen.getByText(/₱150\.50/);
      expect(amountEl.className).toContain('text-neutral-400');
    });

    it('applies bg-text-error/20 icon background for EXPENSE', () => {
      const { container } = render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'EXPENSE' })
      );
      const iconWrapper = container.querySelector('.bg-text-error\\/20');
      expect(iconWrapper).toBeTruthy();
    });

    it('applies bg-text-success/20 icon background for INCOME', () => {
      const { container } = render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'INCOME' })
      );
      const iconWrapper = container.querySelector('.bg-text-success\\/20');
      expect(iconWrapper).toBeTruthy();
    });

    it('applies bg-neutral-500/20 icon background for TRANSFER', () => {
      const { container } = render(
        React.createElement(CompactTransactionCard, { ...baseProps, type: 'TRANSFER' })
      );
      const iconWrapper = container.querySelector('.bg-neutral-500\\/20');
      expect(iconWrapper).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onClick when the card is clicked', () => {
      const onClick = vi.fn();
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, onClick })
      );
      const card = screen.getByText('Coffee').closest('div[class*="bg-card"]') as HTMLElement;
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('amount formatting', () => {
    it('formats zero amount correctly', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, amount: 0 })
      );
      expect(screen.getByText(/₱0\.00/)).toBeTruthy();
    });

    it('formats large amount with locale separators', () => {
      render(
        React.createElement(CompactTransactionCard, { ...baseProps, amount: 100000 })
      );
      // en-PH locale — 100,000.00
      expect(screen.getByText(/₱100,000\.00/)).toBeTruthy();
    });
  });
});
