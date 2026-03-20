import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SkeletonIncomeCard } from './SkeletonIncomeCard';

describe('SkeletonIncomeCard', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      expect(container.firstChild).toBeTruthy();
    });

    it('applies money-map-card class to root element', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });

    it('sets role="status" on the root element for accessibility', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('role')).toBe('status');
    });

    it('sets aria-busy="true" on the root element', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('aria-busy')).toBe('true');
    });

    it('renders skeleton placeholder elements with animate-pulse', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders 5 skeleton items representing the income card fields', () => {
      const { container } = render(React.createElement(SkeletonIncomeCard));
      // icon, title, date row, account label, amount
      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBe(5);
    });
  });
});
