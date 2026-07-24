import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NetWorthPeriodDelta from './NetWorthPeriodDelta';

vi.mock('lucide-react', () => ({
  ArrowUp: () => React.createElement('svg', { 'data-testid': 'icon-arrow-up' }),
  ArrowDown: () => React.createElement('svg', { 'data-testid': 'icon-arrow-down' }),
  ArrowRight: () => React.createElement('svg', { 'data-testid': 'icon-arrow-right' }),
}));

const basePeriods = [
  { period: '1M' as const, label: '1M', available: true },
  { period: '3M' as const, label: '3M', available: true },
  { period: 'YEAR' as const, label: 'This year', available: true },
  { period: '1Y' as const, label: '1Y', available: false, unlocksAt: 'Jan 2027' },
];

describe('NetWorthPeriodDelta', () => {
  it('renders an unavailable period disabled and shows its unlock month', () => {
    render(
      React.createElement(NetWorthPeriodDelta, {
        netWorth: 150000,
        periods: basePeriods,
        selected: '1M',
        onSelect: vi.fn(),
        delta: { amount: 5000, percentage: 3.45, sinceLabel: 'Jun 2026' },
      })
    );

    const button = screen.getByRole('radio', { name: /Unlocks Jan 2027/ });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders the up arrow and success color for a positive delta', () => {
    const { container } = render(
      React.createElement(NetWorthPeriodDelta, {
        netWorth: 150000,
        periods: basePeriods,
        selected: '1M',
        onSelect: vi.fn(),
        delta: { amount: 5000, percentage: 3.45, sinceLabel: 'Jun 2026' },
      })
    );

    expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    expect(container.querySelector('.text-text-success')).toBeTruthy();
  });

  it('renders the down arrow and error color for a negative delta', () => {
    const { container } = render(
      React.createElement(NetWorthPeriodDelta, {
        netWorth: 150000,
        periods: basePeriods,
        selected: '1M',
        onSelect: vi.fn(),
        delta: { amount: -5000, percentage: -3.45, sinceLabel: 'Jun 2026' },
      })
    );

    expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();
    expect(container.querySelector('.text-text-error')).toBeTruthy();
  });

  it('renders the peso amount and the "since" label', () => {
    render(
      React.createElement(NetWorthPeriodDelta, {
        netWorth: 150000,
        periods: basePeriods,
        selected: '1M',
        onSelect: vi.fn(),
        delta: { amount: 5000, percentage: 3.45, sinceLabel: 'Jun 2026' },
      })
    );

    expect(screen.getByText(/₱5,000\.00/)).toBeTruthy();
    expect(screen.getByText(/since Jun 2026/)).toBeTruthy();
  });
});
