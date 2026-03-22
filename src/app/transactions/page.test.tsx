import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/shared/UserMenu', () => ({
  UserMenu: () => React.createElement('div', { 'data-testid': 'user-menu' }),
}));

vi.mock('@/components/transactions/TransactionsMobileView', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mobile-view' }),
}));

vi.mock('@/components/transactions/TransactionsDesktopView', () => ({
  default: () => React.createElement('div', { 'data-testid': 'desktop-view' }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import Transactions from './page';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Transactions page', () => {
  describe('PageHeader integration', () => {
    it('renders the "Transactions" heading', () => {
      render(React.createElement(Transactions));
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Transactions');
    });

    it('renders the UserMenu', () => {
      render(React.createElement(Transactions));
      expect(screen.getByTestId('user-menu')).toBeTruthy();
    });

    it('PageHeader is a direct child — no extra wrapper div around it (hotfix: Task 2)', () => {
      // The fix removed a <div className="mb-6"> wrapper that was preventing
      // the sticky header from sticking. PageHeader must be a direct child
      // of the outer page container so position:sticky has a tall enough
      // containing block to work.
      const { container } = render(React.createElement(Transactions));
      // The outer page container is the first div with max-w-7xl
      const pageContainer = container.querySelector('.max-w-7xl') as HTMLElement;
      expect(pageContainer).toBeTruthy();

      // The sticky wrapper must be a direct child of the page container,
      // not nested inside an extra wrapper div.
      const stickyHeader = pageContainer.querySelector('.sticky') as HTMLElement;
      expect(stickyHeader).toBeTruthy();
      expect(stickyHeader.parentElement).toBe(pageContainer);
    });

    it('renders no actions slot (no actions prop passed)', () => {
      const { container } = render(React.createElement(Transactions));
      // With no actions prop, the actions row (flex justify-end mt-4) must be absent
      const actionsRow = container.querySelector('.flex.justify-end.mt-4');
      expect(actionsRow).toBeNull();
    });

    it('renders the spacer div when no actions are provided', () => {
      const { container } = render(React.createElement(Transactions));
      const spacer = container.querySelector('.mb-3');
      expect(spacer).toBeTruthy();
    });
  });

  describe('mobile/desktop view rendering', () => {
    it('renders the mobile view container', () => {
      render(React.createElement(Transactions));
      expect(screen.getByTestId('mobile-view')).toBeTruthy();
    });

    it('renders the desktop view container', () => {
      render(React.createElement(Transactions));
      expect(screen.getByTestId('desktop-view')).toBeTruthy();
    });

    it('outer page container has max-w-7xl class', () => {
      const { container } = render(React.createElement(Transactions));
      const pageContainer = container.querySelector('.max-w-7xl');
      expect(pageContainer).toBeTruthy();
    });

    it('outer page container has flex flex-col layout', () => {
      const { container } = render(React.createElement(Transactions));
      const pageContainer = container.querySelector('.max-w-7xl') as HTMLElement;
      expect(pageContainer.className).toContain('flex');
      expect(pageContainer.className).toContain('flex-col');
    });
  });
});
