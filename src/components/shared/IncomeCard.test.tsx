import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import IncomeCard from './IncomeCard';

vi.mock('../icons', () => ({
  Icons: {
    addIncome: ({ _size, className }: { _size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-add-income', className }),
  },
}));

const baseProps = {
  id: 'inc-1',
  name: 'Monthly Salary',
  amount: '45000.00',
  date: '2024-03-01T00:00:00.000Z',
  account: { id: 'acc-1', name: 'BDO Savings' },
  incomeType: { id: 'type-1', name: 'Employment' },
  onClick: vi.fn(),
};

describe('IncomeCard', () => {
  describe('rendering — basic content', () => {
    it('renders the income name', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('Monthly Salary')).toBeTruthy();
    });

    it('renders the formatted amount', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('45,000.00')).toBeTruthy();
    });

    it('renders the income type name', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('Employment')).toBeTruthy();
    });

    it('renders the account name', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders "PHP" currency label', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('PHP')).toBeTruthy();
    });
  });

  describe('date formatting', () => {
    it('formats date as "MMM d, yyyy"', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.getByText('Mar 1, 2024')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(React.createElement(IncomeCard, { ...baseProps, onClick }));
      const card = screen.getByText('Monthly Salary').closest('div[class*="money-map"]') as HTMLElement;
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('money-map-card-interactive class', () => {
    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(React.createElement(IncomeCard, baseProps));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });

  describe('amount formatting', () => {
    it('formats decimal amounts correctly', () => {
      render(React.createElement(IncomeCard, { ...baseProps, amount: '1234.5' }));
      expect(screen.getByText('1,234.50')).toBeTruthy();
    });

    it('formats zero amount correctly', () => {
      render(React.createElement(IncomeCard, { ...baseProps, amount: '0' }));
      expect(screen.getByText('0.00')).toBeTruthy();
    });
  });
});
