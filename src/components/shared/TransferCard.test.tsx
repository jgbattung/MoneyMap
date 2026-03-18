import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TransferCard from './TransferCard';

vi.mock('../icons', () => ({
  Icons: {
    addTransfer: ({ _size, className }: { _size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-add-transfer', className }),
  },
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}));

vi.mock('lucide-react', () => ({
  ArrowRight: ({ size }: { size?: number }) =>
    React.createElement('svg', { 'data-testid': 'arrow-right', width: size }),
}));

const baseProps = {
  id: 'txf-1',
  name: 'Savings Transfer',
  amount: 5000,
  date: '2024-03-15T00:00:00.000Z',
  fromAccount: { id: 'acc-1', name: 'BDO Checking' },
  toAccount: { id: 'acc-2', name: 'BDO Savings' },
  transferType: { id: 'tt-1', name: 'Internal' },
  onClick: vi.fn(),
};

describe('TransferCard', () => {
  describe('rendering — basic content', () => {
    it('renders the transfer name', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.getByText('Savings Transfer')).toBeTruthy();
    });

    it('renders the formatted amount', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.getByText('5,000.00')).toBeTruthy();
    });

    it('renders the transfer type name', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.getByText('Internal')).toBeTruthy();
    });

    it('renders from and to account names', () => {
      const { container } = render(React.createElement(TransferCard, baseProps));
      const accountRow = container.querySelector('[class*="items-center"][class*="gap-2"][class*="font-medium"]') as HTMLElement;
      expect(accountRow.textContent).toContain('BDO Checking');
      expect(accountRow.textContent).toContain('BDO Savings');
    });

    it('renders "PHP" currency label', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.getByText('PHP')).toBeTruthy();
    });

    it('formats date as "MMM d, yyyy"', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.getByText('Mar 15, 2024')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(React.createElement(TransferCard, { ...baseProps, onClick }));
      const card = screen.getByText('Savings Transfer').closest('div[class*="money-map"]') as HTMLElement;
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('money-map-card-interactive class', () => {
    it('applies money-map-card-interactive class to root element', () => {
      const { container } = render(React.createElement(TransferCard, baseProps));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });

  describe('tags rendering', () => {
    it('renders tag badges when tags are provided', () => {
      const tags = [
        { id: 'tag-1', name: 'Monthly', color: '#ff0000' },
        { id: 'tag-2', name: 'Savings', color: '#00ff00' },
      ];
      render(React.createElement(TransferCard, { ...baseProps, tags }));
      expect(screen.getByText('Monthly')).toBeTruthy();
      expect(screen.getByText('Savings')).toBeTruthy();
    });

    it('shows overflow indicator when more than 3 tags', () => {
      const tags = [
        { id: 'tag-1', name: 'Tag1', color: '#ff0000' },
        { id: 'tag-2', name: 'Tag2', color: '#00ff00' },
        { id: 'tag-3', name: 'Tag3', color: '#0000ff' },
        { id: 'tag-4', name: 'Tag4', color: '#ffff00' },
        { id: 'tag-5', name: 'Tag5', color: '#ff00ff' },
      ];
      render(React.createElement(TransferCard, { ...baseProps, tags }));
      expect(screen.getByText('+2 more')).toBeTruthy();
      expect(screen.getByText('Tag1')).toBeTruthy();
      expect(screen.getByText('Tag2')).toBeTruthy();
      expect(screen.getByText('Tag3')).toBeTruthy();
      expect(screen.queryByText('Tag4')).toBeNull();
      expect(screen.queryByText('Tag5')).toBeNull();
    });

    it('renders no tags section when tags is undefined', () => {
      render(React.createElement(TransferCard, baseProps));
      expect(screen.queryByTestId('badge')).toBeNull();
    });
  });
});
