import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AccountCard from './AccountCard';

// Mock next/navigation router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock icons
vi.mock('../icons', () => ({
  Icons: {
    bank: ({ size, className }: { size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-bank', className }),
    ellipsis: ({ size, className }: { size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-ellipsis', className }),
    edit: ({ size, className }: { size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-edit', className }),
    trash: ({ size, className }: { size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-trash', className }),
    addToNetWorth: ({ size, className }: { size?: number; className?: string }) =>
      React.createElement('svg', { 'data-testid': 'icon-net-worth', className }),
  },
}));

// Mock Shadcn DropdownMenu components — flatten to simple divs to avoid Radix portal issues
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  DropdownMenuTrigger: ({ children, onClick, className }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; className?: string }) =>
    React.createElement('button', { 'data-testid': 'dropdown-trigger', onClick, className }, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dropdown-content' }, children),
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; className?: string }) =>
    React.createElement('div', { 'data-testid': 'dropdown-item', onClick, className, role: 'menuitem' }, children),
}));

// Mock capitalizeFirstLetter utility
vi.mock('@/lib/utils', () => ({
  capitalizeFirstLetter: (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const baseProps = {
  id: 'acc-1',
  accountType: 'SAVINGS',
  addToNetWorth: false,
  currentBalance: '25000.50',
  name: 'BDO Savings',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountCard', () => {
  describe('rendering — basic content', () => {
    it('renders the account name', () => {
      render(React.createElement(AccountCard, baseProps));
      expect(screen.getByText('BDO Savings')).toBeTruthy();
    });

    it('renders the formatted balance', () => {
      render(React.createElement(AccountCard, baseProps));
      expect(screen.getByText('25,000.50')).toBeTruthy();
    });

    it('renders account type with capitalized words', () => {
      render(React.createElement(AccountCard, baseProps));
      expect(screen.getByText('Savings')).toBeTruthy();
    });

    it('renders account type with underscores formatted correctly', () => {
      render(
        React.createElement(AccountCard, { ...baseProps, accountType: 'CREDIT_CARD' })
      );
      expect(screen.getByText('Credit Card')).toBeTruthy();
    });

    it('renders "Balance" label', () => {
      render(React.createElement(AccountCard, baseProps));
      expect(screen.getByText('Balance')).toBeTruthy();
    });

    it('renders "PHP" currency label', () => {
      render(React.createElement(AccountCard, baseProps));
      expect(screen.getByText('PHP')).toBeTruthy();
    });
  });

  describe('addToNetWorth indicator', () => {
    it('does not render net-worth icon when addToNetWorth is false', () => {
      render(React.createElement(AccountCard, { ...baseProps, addToNetWorth: false }));
      expect(screen.queryByTestId('icon-net-worth')).toBeNull();
    });

    it('renders net-worth icon when addToNetWorth is true', () => {
      render(React.createElement(AccountCard, { ...baseProps, addToNetWorth: true }));
      expect(screen.getByTestId('icon-net-worth')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to account detail page on card click', () => {
      const { container } = render(React.createElement(AccountCard, baseProps));
      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1');
    });
  });

  describe('dropdown menu actions', () => {
    it('calls onEdit when edit menu item is clicked', () => {
      const onEdit = vi.fn();
      render(React.createElement(AccountCard, { ...baseProps, onEdit }));

      const menuItems = screen.getAllByTestId('dropdown-item');
      const editItem = menuItems.find((el) => el.textContent?.includes('Edit'));
      expect(editItem).toBeTruthy();
      fireEvent.click(editItem!);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when delete menu item is clicked', () => {
      const onDelete = vi.fn();
      render(React.createElement(AccountCard, { ...baseProps, onDelete }));

      const menuItems = screen.getAllByTestId('dropdown-item');
      const deleteItem = menuItems.find((el) => el.textContent?.includes('Delete'));
      expect(deleteItem).toBeTruthy();
      fireEvent.click(deleteItem!);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('money-map-card-interactive class', () => {
    it('applies money-map-card-interactive to the root element', () => {
      const { container } = render(React.createElement(AccountCard, baseProps));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card-interactive');
    });
  });

  describe('balance formatting', () => {
    it('formats zero balance correctly', () => {
      render(React.createElement(AccountCard, { ...baseProps, currentBalance: '0' }));
      expect(screen.getByText('0.00')).toBeTruthy();
    });

    it('formats large balances with locale separators', () => {
      render(React.createElement(AccountCard, { ...baseProps, currentBalance: '1000000' }));
      expect(screen.getByText('1,000,000.00')).toBeTruthy();
    });
  });
});
