import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) =>
    React.createElement('a', { href, className }, children),
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: ({ size }: { size?: number }) =>
    React.createElement('span', { 'data-testid': 'arrow-left-icon', 'data-size': size }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { MobileDetailHeader } from './MobileDetailHeader';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('MobileDetailHeader', () => {
  describe('structure', () => {
    it('renders the outer container with md:hidden class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer).toBeTruthy();
      expect(outer.className).toContain('md:hidden');
    });

    it('renders the outer container with relative flex layout classes', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('relative');
      expect(outer.className).toContain('flex');
    });

    it('renders the outer container with justify-center class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('justify-center');
    });
  });

  describe('sticky header (header polish redesign)', () => {
    it('outer container has sticky class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('sticky');
    });

    it('outer container has top-0 class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('top-0');
    });

    it('outer container has z-10 class for stacking context', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('z-10');
    });

    it('outer container has bg-background to opacify the sticky bar', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('bg-background');
    });
  });

  describe('title', () => {
    it('renders the title text in a span', () => {
      render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      expect(screen.getByText('Accounts')).toBeTruthy();
    });

    it('renders an arbitrary title string', () => {
      render(
        React.createElement(MobileDetailHeader, { backHref: '/cards', title: 'Cards' })
      );
      expect(screen.getByText('Cards')).toBeTruthy();
    });

    it('title span has font-semibold class', () => {
      render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const span = screen.getByText('Accounts');
      expect(span.tagName.toLowerCase()).toBe('span');
      expect(span.className).toContain('font-semibold');
    });
  });

  describe('back link', () => {
    it('renders an anchor element', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const anchor = container.querySelector('a');
      expect(anchor).toBeTruthy();
    });

    it('renders the anchor with the correct href', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const anchor = container.querySelector('a');
      expect(anchor?.getAttribute('href')).toBe('/accounts');
    });

    it('renders with a different backHref', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/cards', title: 'Cards' })
      );
      const anchor = container.querySelector('a');
      expect(anchor?.getAttribute('href')).toBe('/cards');
    });

    it('anchor has absolute left-0 positioning class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const anchor = container.querySelector('a');
      expect(anchor?.className).toContain('absolute');
      expect(anchor?.className).toContain('left-0');
    });

    it('anchor has muted-foreground text class', () => {
      const { container } = render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const anchor = container.querySelector('a');
      expect(anchor?.className).toContain('text-muted-foreground');
    });
  });

  describe('arrow icon', () => {
    it('renders the ArrowLeft icon inside the back link', () => {
      render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      expect(screen.getByTestId('arrow-left-icon')).toBeTruthy();
    });

    it('renders the ArrowLeft icon with size 20', () => {
      render(
        React.createElement(MobileDetailHeader, { backHref: '/accounts', title: 'Accounts' })
      );
      const icon = screen.getByTestId('arrow-left-icon');
      expect(icon.getAttribute('data-size')).toBe('20');
    });
  });
});
