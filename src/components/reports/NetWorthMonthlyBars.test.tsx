import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NetWorthMonthlyBars from './NetWorthMonthlyBars';

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Recharts can't render in jsdom without ResizeObserver — stub it entirely.
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: ({ dataKey, maxBarSize, children }: { dataKey: string; maxBarSize?: number; children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': `bar-${dataKey}`, 'data-max-bar-size': maxBarSize }, children),
  Cell: ({ fill }: { fill: string }) =>
    React.createElement('div', { 'data-testid': 'bar-cell', 'data-fill': fill }),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ReferenceLine: ({ y }: { y: number }) =>
    React.createElement('div', { 'data-testid': 'reference-line', 'data-y': y }),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const SAMPLE_DATA = [
  { month: 'Jan 2026', change: 5000 },
  { month: 'Feb 2026', change: -3000 },
  { month: 'Mar 2026', change: 2000 },
];

describe('NetWorthMonthlyBars', () => {
  it('renders one cell per datum', () => {
    render(React.createElement(NetWorthMonthlyBars, { data: SAMPLE_DATA }));
    expect(screen.getAllByTestId('bar-cell')).toHaveLength(SAMPLE_DATA.length);
  });

  it('renders a zero reference line', () => {
    render(React.createElement(NetWorthMonthlyBars, { data: SAMPLE_DATA }));
    const line = screen.getByTestId('reference-line');
    expect(line.getAttribute('data-y')).toBe('0');
  });

  it('uses the error token (not destructive) for a negative datum', () => {
    render(React.createElement(NetWorthMonthlyBars, { data: SAMPLE_DATA }));
    const cells = screen.getAllByTestId('bar-cell');
    const negativeCell = cells[1]; // Feb 2026, -3000
    expect(negativeCell.getAttribute('data-fill')).toBe('var(--text-error)');
    expect(negativeCell.getAttribute('data-fill')).not.toContain('destructive');
  });

  it('uses the success token for a positive datum', () => {
    render(React.createElement(NetWorthMonthlyBars, { data: SAMPLE_DATA }));
    const cells = screen.getAllByTestId('bar-cell');
    expect(cells[0].getAttribute('data-fill')).toBe('var(--text-success)');
  });

  it('caps bar width via maxBarSize so few-bar periods do not balloon', () => {
    render(React.createElement(NetWorthMonthlyBars, { data: SAMPLE_DATA }));
    const bar = screen.getByTestId('bar-change');
    expect(bar.getAttribute('data-max-bar-size')).toBe('48');
  });
});
