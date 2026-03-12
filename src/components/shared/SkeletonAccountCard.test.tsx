import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SkeletonAccountCard from './SkeletonAccountCard';

describe('SkeletonAccountCard', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonAccountCard));
      expect(container.firstChild).toBeTruthy();
    });

    it('applies money-map-card class to root element', () => {
      const { container } = render(React.createElement(SkeletonAccountCard));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });

    it('renders skeleton placeholder elements', () => {
      const { container } = render(React.createElement(SkeletonAccountCard));
      // Skeleton components render divs with animation classes
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple skeleton items to represent account card fields', () => {
      const { container } = render(React.createElement(SkeletonAccountCard));
      // 4 Skeleton elements are expected (name, badge, balance, label)
      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBe(4);
    });
  });
});
