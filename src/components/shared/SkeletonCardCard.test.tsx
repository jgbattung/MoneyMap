import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SkeletonCardCard from './SkeletonCardCard';

describe('SkeletonCardCard', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonCardCard));
      expect(container.firstChild).toBeTruthy();
    });

    it('applies money-map-card class to root element', () => {
      const { container } = render(React.createElement(SkeletonCardCard));
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });

    it('renders skeleton placeholder elements', () => {
      const { container } = render(React.createElement(SkeletonCardCard));
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders multiple skeleton items to represent credit card fields', () => {
      const { container } = render(React.createElement(SkeletonCardCard));
      // 5 Skeleton elements: name, 2 detail lines, balance, limit
      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBe(5);
    });
  });
});
