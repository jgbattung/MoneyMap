import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EmptyState } from './EmptyState';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/link — render a plain <a> so href is inspectable
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement('a', { href, className }, children),
}));

// Mock Button so we can detect it without Radix/CSS setup
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    asChild?: boolean;
  }) => React.createElement('button', { 'data-testid': 'cta-button', onClick, className }, children),
}));

// A simple stub LucideIcon that exposes its props for assertion.
// strokeWidth is stored as a data attribute so it is readable via getAttribute.
const MockIcon = ({
  className,
  strokeWidth,
  'aria-hidden': ariaHidden,
}: {
  className?: string;
  strokeWidth?: number;
  'aria-hidden'?: string;
}) =>
  React.createElement('svg', {
    'data-testid': 'empty-state-icon',
    'data-stroke-width': strokeWidth,
    className,
    'aria-hidden': ariaHidden,
  });

// ---------------------------------------------------------------------------
// Shared props factory
// ---------------------------------------------------------------------------

function makeProps(overrides: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  return {
    icon: MockIcon as never,
    title: 'Nothing here',
    description: 'Add something to get started',
    variant: 'page' as const,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  // -------------------------------------------------------------------------
  describe('common rendering', () => {
    it('renders the title text', () => {
      render(React.createElement(EmptyState, makeProps()));
      expect(screen.getByText('Nothing here')).toBeTruthy();
    });

    it('renders the description text', () => {
      render(React.createElement(EmptyState, makeProps()));
      expect(screen.getByText('Add something to get started')).toBeTruthy();
    });

    it('renders the icon component', () => {
      render(React.createElement(EmptyState, makeProps()));
      expect(screen.getByTestId('empty-state-icon')).toBeTruthy();
    });

    it('sets aria-hidden="true" on the icon for all variants', () => {
      for (const variant of ['page', 'widget', 'table'] as const) {
        const { unmount } = render(React.createElement(EmptyState, makeProps({ variant })));
        const icon = screen.getByTestId('empty-state-icon');
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        unmount();
      }
    });

    it('does not render a CTA button when action is omitted', () => {
      render(React.createElement(EmptyState, makeProps({ action: undefined })));
      expect(screen.queryByTestId('cta-button')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('page variant', () => {
    it('applies the page container class', () => {
      const { container } = render(React.createElement(EmptyState, makeProps({ variant: 'page' })));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('py-16');
    });

    it('applies page-sized icon class (h-20 w-20)', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'page' })));
      const icon = screen.getByTestId('empty-state-icon');
      expect(icon.className).toContain('h-20');
      expect(icon.className).toContain('w-20');
    });

    it('applies strokeWidth 1.25 on the icon for page variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'page' })));
      const icon = screen.getByTestId('empty-state-icon');
      expect(Number(icon.getAttribute('data-stroke-width'))).toBe(1.25);
    });

    it('renders a Button CTA when action.href is provided', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Go there', href: '/somewhere' } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
      expect(screen.getByText('Go there')).toBeTruthy();
    });

    it('renders a Button CTA when action.onClick is provided', () => {
      const onClick = vi.fn();
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Click me', onClick } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
    });

    it('calls action.onClick when the CTA button is clicked', () => {
      const onClick = vi.fn();
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Click me', onClick } })
        )
      );
      fireEvent.click(screen.getByTestId('cta-button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders the action label inside the CTA', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Add Account', href: '/accounts' } })
        )
      );
      expect(screen.getByText('Add Account')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('widget variant', () => {
    it('applies the widget container class (py-8)', () => {
      const { container } = render(
        React.createElement(EmptyState, makeProps({ variant: 'widget' }))
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('py-8');
    });

    it('applies widget-sized icon class (h-8 w-8)', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'widget' })));
      const icon = screen.getByTestId('empty-state-icon');
      expect(icon.className).toContain('h-8');
      expect(icon.className).toContain('w-8');
    });

    it('applies strokeWidth 1.5 on the icon for widget variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'widget' })));
      const icon = screen.getByTestId('empty-state-icon');
      expect(Number(icon.getAttribute('data-stroke-width'))).toBe(1.5);
    });

    it('renders a plain link (not a Button) when action.href is provided', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'widget', action: { label: 'View all', href: '/budgets' } })
        )
      );
      // Should NOT render a Button for widget + href
      expect(screen.queryByTestId('cta-button')).toBeNull();
      // Should render a plain anchor
      const link = screen.getByText('View all').closest('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('/budgets');
    });

    it('renders a Button CTA when action.onClick is provided in widget variant', () => {
      const onClick = vi.fn();
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'widget', action: { label: 'Add item', onClick } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
    });

    it('calls action.onClick when widget CTA button is clicked', () => {
      const onClick = vi.fn();
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'widget', action: { label: 'Add item', onClick } })
        )
      );
      fireEvent.click(screen.getByTestId('cta-button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not render a CTA when no action is provided', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'widget', action: undefined })));
      expect(screen.queryByTestId('cta-button')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('table variant', () => {
    it('applies the table container class (h-32)', () => {
      const { container } = render(
        React.createElement(EmptyState, makeProps({ variant: 'table' }))
      );
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('h-32');
    });

    it('applies table-sized icon class (h-6 w-6)', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'table' })));
      const icon = screen.getByTestId('empty-state-icon');
      expect(icon.className).toContain('h-6');
      expect(icon.className).toContain('w-6');
    });

    it('never renders a CTA even when action is provided with href', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'table', action: { label: 'Add row', href: '/add' } })
        )
      );
      expect(screen.queryByTestId('cta-button')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('never renders a CTA even when action is provided with onClick', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'table', action: { label: 'Add row', onClick: vi.fn() } })
        )
      );
      expect(screen.queryByTestId('cta-button')).toBeNull();
    });

    it('still renders title and description for table variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'table' })));
      expect(screen.getByText('Nothing here')).toBeTruthy();
      expect(screen.getByText('Add something to get started')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('icon aria-hidden attribute', () => {
    it('sets aria-hidden="true" on the icon for page variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'page' })));
      expect(screen.getByTestId('empty-state-icon').getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-hidden="true" on the icon for widget variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'widget' })));
      expect(screen.getByTestId('empty-state-icon').getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-hidden="true" on the icon for table variant', () => {
      render(React.createElement(EmptyState, makeProps({ variant: 'table' })));
      expect(screen.getByTestId('empty-state-icon').getAttribute('aria-hidden')).toBe('true');
    });
  });

  // -------------------------------------------------------------------------
  describe('CTA rendering rules summary', () => {
    it('page + href → renders Button (with nested Link child)', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Go', href: '/go' } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
    });

    it('page + onClick → renders Button', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'page', action: { label: 'Go', onClick: vi.fn() } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
    });

    it('widget + href → renders plain Link only (no Button)', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'widget', action: { label: 'Go', href: '/go' } })
        )
      );
      expect(screen.queryByTestId('cta-button')).toBeNull();
      expect(screen.getByText('Go').closest('a')).toBeTruthy();
    });

    it('widget + onClick → renders Button', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'widget', action: { label: 'Go', onClick: vi.fn() } })
        )
      );
      expect(screen.getByTestId('cta-button')).toBeTruthy();
    });

    it('table + href → renders nothing (CTA suppressed)', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'table', action: { label: 'Go', href: '/go' } })
        )
      );
      expect(screen.queryByTestId('cta-button')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('table + onClick → renders nothing (CTA suppressed)', () => {
      render(
        React.createElement(
          EmptyState,
          makeProps({ variant: 'table', action: { label: 'Go', onClick: vi.fn() } })
        )
      );
      expect(screen.queryByTestId('cta-button')).toBeNull();
    });
  });
});
