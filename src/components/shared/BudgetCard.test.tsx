import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BudgetCard from './BudgetCard';

// Icons mock
vi.mock('../icons', () => ({
  Icons: {
    money: ({ _size, className }: { _size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-money', className }),
  },
}));

const baseProps = {
  name: 'Food & Dining',
  monthlyBudget: '5000',
  spentAmount: 2000,
  onClick: vi.fn(),
};

describe('BudgetCard', () => {
  describe('rendering — basic content', () => {
    it('renders the budget category name', () => {
      render(React.createElement(BudgetCard, baseProps));
      expect(screen.getByText('Food & Dining')).toBeTruthy();
    });

    it('renders the monthly budget amount', () => {
      render(React.createElement(BudgetCard, baseProps));
      expect(screen.getByText(/Monthly budget:.*₱5,000\.00/)).toBeTruthy();
    });

    it('renders the spent amount', () => {
      render(React.createElement(BudgetCard, baseProps));
      expect(screen.getByText(/₱2,000\.00 spent this month/)).toBeTruthy();
    });
  });

  describe('status text logic', () => {
    it('shows "On budget" when spending is within budget', () => {
      render(React.createElement(BudgetCard, baseProps));
      expect(screen.getByText('On budget')).toBeTruthy();
    });

    it('shows "Over budget" when spending exceeds the budget', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: '1000',
          spentAmount: 1500,
        })
      );
      expect(screen.getByText('Over budget')).toBeTruthy();
    });

    it('shows "No budget set" when monthlyBudget is null and no spending', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 0,
        })
      );
      expect(screen.getAllByText('No budget set').length).toBeGreaterThan(0);
    });

    it('shows "Over budget" when there is spending but no budget', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 500,
        })
      );
      expect(screen.getByText('Over budget')).toBeTruthy();
    });
  });

  describe('progress bar percentage display', () => {
    it('shows percentage of budget used when budget > 0', () => {
      render(React.createElement(BudgetCard, baseProps));
      // 2000/5000 = 40%
      expect(screen.getByText('40% of budget')).toBeTruthy();
    });

    it('shows "No budget set" in percentage area when no budget', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 0,
        })
      );
      // "No budget set" appears in percentage label
      expect(screen.getAllByText('No budget set').length).toBeGreaterThan(0);
    });
  });

  describe('progress color logic', () => {
    it('applies bg-green-600 progress color when under budget', () => {
      const { container } = render(React.createElement(BudgetCard, baseProps));
      const progressBar = container.querySelector('.bg-green-600');
      expect(progressBar).toBeTruthy();
    });

    it('applies bg-error-500 progress color when over budget', () => {
      const { container } = render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: '1000',
          spentAmount: 2000,
        })
      );
      const progressBar = container.querySelector('.bg-error-500');
      expect(progressBar).toBeTruthy();
    });

    it('applies bg-gray-400 progress color when empty (no budget, no spending)', () => {
      const { container } = render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 0,
        })
      );
      // The initial progressColor for empty is bg-gray-400 — it is the track bar
      // The inner bar also starts as bg-gray-400 in empty state
      const grayBars = container.querySelectorAll('.bg-gray-400');
      expect(grayBars.length).toBeGreaterThan(0);
    });

    it('applies bg-error-500 when there is spending but no budget set', () => {
      const { container } = render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 200,
        })
      );
      const progressBar = container.querySelector('.bg-error-500');
      expect(progressBar).toBeTruthy();
    });
  });

  describe('status text color logic', () => {
    it('applies error color when over budget', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: '1000',
          spentAmount: 2000,
        })
      );
      const statusEl = screen.getByText('Over budget');
      expect(statusEl.className).toContain('text-error-600');
    });

    it('applies green color when on budget', () => {
      render(React.createElement(BudgetCard, baseProps));
      const statusEl = screen.getByText('On budget');
      expect(statusEl.className).toContain('text-green-600');
    });

    it('applies muted color when no budget set and no spending', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 0,
        })
      );
      // The status text area shows "No budget set"
      const statusEls = screen.getAllByText('No budget set');
      // At least one should have muted class (the status text at bottom right)
      const hasMuted = statusEls.some((el) => el.className?.includes('text-muted-foreground'));
      expect(hasMuted).toBe(true);
    });
  });

  describe('monthly budget display', () => {
    it('shows "Not set" when budget is null', () => {
      render(
        React.createElement(BudgetCard, {
          ...baseProps,
          monthlyBudget: null,
          spentAmount: 0,
        })
      );
      expect(screen.getByText(/Monthly budget:.*Not set/)).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onClick when the card is clicked', () => {
      const onClick = vi.fn();
      render(React.createElement(BudgetCard, { ...baseProps, onClick }));
      const card = screen.getByText('Food & Dining').closest('div') as HTMLElement;
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('money-map-card-interactive class', () => {
    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(React.createElement(BudgetCard, baseProps));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });
});
