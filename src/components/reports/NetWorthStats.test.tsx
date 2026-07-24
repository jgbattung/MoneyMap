import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NetWorthStats from './NetWorthStats';

const SAMPLE_STATS = {
  peak: { value: 130000, month: 'Jul 2026' },
  average: 4000,
  monthsUp: 2,
  monthsTotal: 3,
  streak: 1,
};

describe('NetWorthStats', () => {
  it('renders all three stats with the scope label appended', () => {
    render(React.createElement(NetWorthStats, { stats: SAMPLE_STATS, scopeLabel: 'last 3M' }));

    expect(screen.getByText(/Highest ever · last 3M/)).toBeTruthy();
    expect(screen.getByText(/Avg \/ month · last 3M/)).toBeTruthy();
    expect(screen.getByText(/Consistency · last 3M/)).toBeTruthy();
  });

  it('renders the peak, average, and consistency values', () => {
    render(React.createElement(NetWorthStats, { stats: SAMPLE_STATS, scopeLabel: 'last 3M' }));

    expect(screen.getByText('₱130,000')).toBeTruthy();
    expect(screen.getByText('2 of 3 up')).toBeTruthy();
  });

  it('renders no child element with a border or background utility class', () => {
    const { container } = render(
      React.createElement(NetWorthStats, { stats: SAMPLE_STATS, scopeLabel: 'last 3M' })
    );

    const all = container.querySelectorAll('*');
    all.forEach((el) => {
      const className = el.className;
      const classes = typeof className === 'string' ? className : '';
      expect(classes).not.toMatch(/\bborder\b/);
      expect(classes).not.toMatch(/\bbg-(?!clip)/);
    });
  });

  it('renders stat values with a smaller font size than the headline figure', () => {
    const { container } = render(
      React.createElement(NetWorthStats, { stats: SAMPLE_STATS, scopeLabel: 'last 3M' })
    );

    // Headline in NetWorthPeriodDelta uses text-4xl at the largest breakpoint;
    // stat values must not use that class.
    const values = container.querySelectorAll('.text-numeric');
    values.forEach((el) => {
      expect(el.className).not.toMatch(/text-4xl/);
      expect(el.className).toMatch(/text-lg/);
    });
  });
});
