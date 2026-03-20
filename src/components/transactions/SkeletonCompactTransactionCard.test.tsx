import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SkeletonCompactTransactionCard } from './SkeletonCompactTransactionCard';

describe('SkeletonCompactTransactionCard', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      expect(container.firstChild).toBeTruthy();
    });

    it('applies bg-card and border classes to root element', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('bg-card');
      expect(root.className).toContain('border');
      expect(root.className).toContain('rounded-lg');
    });

    it('sets role="status" on the root element for accessibility', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('role')).toBe('status');
    });

    it('sets aria-busy="true" on the root element', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('aria-busy')).toBe('true');
    });

    it('renders skeleton placeholder elements with animate-pulse', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders 5 skeleton items representing the compact card fields', () => {
      const { container } = render(React.createElement(SkeletonCompactTransactionCard));
      // icon, title, amount, date/account label, type badge
      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBe(5);
    });
  });
});
