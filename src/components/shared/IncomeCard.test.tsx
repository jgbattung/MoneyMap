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

vi.mock('../ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
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

  describe('tags rendering', () => {
    it('renders tag badges when tags are provided', () => {
      const tags = [
        { id: 'tag-1', name: 'Salary', color: '#ff0000' },
        { id: 'tag-2', name: 'Recurring', color: '#00ff00' },
      ];
      render(React.createElement(IncomeCard, { ...baseProps, tags }));
      expect(screen.getByText('Salary')).toBeTruthy();
      expect(screen.getByText('Recurring')).toBeTruthy();
    });

    it('shows overflow indicator when more than 3 tags', () => {
      const tags = [
        { id: 'tag-1', name: 'Tag1', color: '#ff0000' },
        { id: 'tag-2', name: 'Tag2', color: '#00ff00' },
        { id: 'tag-3', name: 'Tag3', color: '#0000ff' },
        { id: 'tag-4', name: 'Tag4', color: '#ffff00' },
        { id: 'tag-5', name: 'Tag5', color: '#ff00ff' },
      ];
      render(React.createElement(IncomeCard, { ...baseProps, tags }));
      expect(screen.getByText('+2 more')).toBeTruthy();
      expect(screen.getByText('Tag1')).toBeTruthy();
      expect(screen.getByText('Tag2')).toBeTruthy();
      expect(screen.getByText('Tag3')).toBeTruthy();
      expect(screen.queryByText('Tag4')).toBeNull();
      expect(screen.queryByText('Tag5')).toBeNull();
    });

    it('renders no tags section when tags is undefined', () => {
      render(React.createElement(IncomeCard, baseProps));
      expect(screen.queryByTestId('badge')).toBeNull();
    });
  });
});
