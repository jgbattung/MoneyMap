import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SkeletonBudgetCard from './SkeletonBudgetCard';

describe('SkeletonBudgetCard', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonBudgetCard));
      expect(container.firstChild).toBeTruthy();
    });

    it('applies money-map-card class to root element', () => {
      const { container } = render(React.createElement(SkeletonBudgetCard));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });

    it('renders skeleton placeholder elements', () => {
      const { container } = render(React.createElement(SkeletonBudgetCard));
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple skeleton items to represent budget card fields', () => {
      const { container } = render(React.createElement(SkeletonBudgetCard));
      // 6 Skeleton elements: icon, name, budget text, progress bar, left label, right label
      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBe(6);
    });
  });
});
