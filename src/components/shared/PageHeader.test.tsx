import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/shared/UserMenu', () => ({
  UserMenu: () => React.createElement('div', { 'data-testid': 'user-menu' }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { PageHeader } from './PageHeader';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PageHeader', () => {
  describe('title — Row 1', () => {
    it('renders the title text', () => {
      render(React.createElement(PageHeader, { title: 'Dashboard' }));
      expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('renders the title in an h1 element', () => {
      render(React.createElement(PageHeader, { title: 'Accounts' }));
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeTruthy();
      expect(heading.textContent).toBe('Accounts');
    });

    it('applies responsive text size classes to the h1', () => {
      render(React.createElement(PageHeader, { title: 'Reports' }));
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('text-2xl');
      expect(heading.className).toContain('md:text-3xl');
    });

    it('applies font-semibold class to the h1', () => {
      render(React.createElement(PageHeader, { title: 'Settings' }));
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('font-semibold');
    });
  });

  describe('UserMenu — Row 1', () => {
    it('renders the UserMenu component', () => {
      render(React.createElement(PageHeader, { title: 'Dashboard' }));
      expect(screen.getByTestId('user-menu')).toBeTruthy();
    });

    it('UserMenu and title are both present in the same row', () => {
      const { container } = render(
        React.createElement(PageHeader, { title: 'Dashboard' })
      );
      const row1 = container.querySelector('.flex.items-center.justify-between');
      expect(row1).toBeTruthy();
      expect(row1?.querySelector('[data-testid="user-menu"]')).toBeTruthy();
      expect(row1?.querySelector('h1')).toBeTruthy();
    });
  });

  describe('actions slot — Row 2', () => {
    it('does NOT render Row 2 when actions is not provided', () => {
      const { container } = render(
        React.createElement(PageHeader, { title: 'Dashboard' })
      );
      // actions div uses flex justify-end mt-4 in the current implementation
      const actionsRow = container.querySelector('.flex.justify-end.mt-4');
      expect(actionsRow).toBeNull();
    });

    it('renders Row 2 when actions is provided', () => {
      const actionsNode = React.createElement(
        'button',
        { 'data-testid': 'action-btn' },
        'New Transaction'
      );
      const { container } = render(
        React.createElement(PageHeader, { title: 'Dashboard', actions: actionsNode })
      );
      // actions div uses mt-4 (updated from mt-3 in header redesign)
      const actionsRow = container.querySelector('.flex.justify-end.mt-4');
      expect(actionsRow).toBeTruthy();
    });

    it('renders the actions content inside Row 2', () => {
      const actionsNode = React.createElement(
        'button',
        { 'data-testid': 'action-btn' },
        'Add Account'
      );
      render(React.createElement(PageHeader, { title: 'Accounts', actions: actionsNode }));
      expect(screen.getByTestId('action-btn')).toBeTruthy();
      expect(screen.getByText('Add Account')).toBeTruthy();
    });

    it('Row 2 is right-aligned (flex justify-end)', () => {
      const actionsNode = React.createElement('span', { 'data-testid': 'action' }, 'Filter');
      const { container } = render(
        React.createElement(PageHeader, { title: 'Transactions', actions: actionsNode })
      );
      const actionsRow = container.querySelector('.flex.justify-end');
      expect(actionsRow).toBeTruthy();
    });

    it('renders multiple action elements inside Row 2', () => {
      const actionsNode = React.createElement(
        React.Fragment,
        null,
        React.createElement('button', { 'data-testid': 'btn-1' }, 'Export'),
        React.createElement('button', { 'data-testid': 'btn-2' }, 'Import')
      );
      render(React.createElement(PageHeader, { title: 'Reports', actions: actionsNode }));
      expect(screen.getByTestId('btn-1')).toBeTruthy();
      expect(screen.getByTestId('btn-2')).toBeTruthy();
    });
  });

  describe('sticky header (header polish redesign)', () => {
    it('outer container has sticky class', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('sticky');
    });

    it('outer container has top-0 class', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('top-0');
    });

    it('outer container has z-10 class for stacking context', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('z-10');
    });

    it('outer container has bg-background to opacify the sticky bar', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('bg-background');
    });

    it('outer container has pt-6 top padding', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('pt-6');
    });

    it('outer container has mb-3 bottom margin', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('mb-3');
    });
  });

  describe('border divider (inner row)', () => {
    it('inner row has border-b class', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      // border-b lives on the inner row div, not the outer wrapper
      const innerRow = container.querySelector('.flex.items-center.justify-between');
      expect(innerRow?.className).toContain('border-b');
    });

    it('inner row has pb-4 padding class', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const innerRow = container.querySelector('.flex.items-center.justify-between');
      expect(innerRow?.className).toContain('pb-4');
    });

    it('outer container does NOT carry border-b (border moved to inner row)', () => {
      const { container } = render(React.createElement(PageHeader, { title: 'Dashboard' }));
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).not.toContain('border-b');
    });
  });
});
