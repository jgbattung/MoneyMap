import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AnalyzerMonthlyTrend from './AnalyzerMonthlyTrend';

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) =>
    React.createElement(
      'div',
      { 'data-testid': 'bar-chart', 'data-chart-data': JSON.stringify(data) },
      children
    ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill?: string }) =>
    React.createElement('div', { 'data-testid': `bar-${dataKey}`, 'data-fill': fill }),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ReferenceLine: ({ y, label }: { y: number; label?: { value: string } }) =>
    React.createElement('div', {
      'data-testid': 'reference-line',
      'data-y': y,
      'data-label': label?.value,
    }),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const THREE = [
  { month: '2026-01', amount: 100, count: 2 },
  { month: '2026-02', amount: 0, count: 0 },
  { month: '2026-03', amount: 50.5, count: 1 },
];

const labels = () =>
  JSON.parse(screen.getByTestId('bar-chart').getAttribute('data-chart-data')!).map(
    (d: { label: string }) => d.label
  );

describe('AnalyzerMonthlyTrend', () => {
  it('renders nothing for 1 month', () => {
    const { container } = render(
      <AnalyzerMonthlyTrend data={[THREE[0]]} totalAmount={100} />
    );
    expect(container.innerHTML).toBe("");
  });

  it('renders nothing for 0 months', () => {
    const { container } = render(<AnalyzerMonthlyTrend data={[]} totalAmount={0} />);
    expect(container.innerHTML).toBe("");
  });

  it('renders the heading and chart for 2+ months', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150.5} />);
    expect(screen.getByText('Monthly Trend')).toBeTruthy();
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });

  it('puts the reference line at totalAmount / months, zero months included', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150} />);
    expect(screen.getByTestId('reference-line').getAttribute('data-y')).toBe('50');
  });

  it('labels the reference line with avg and the formatted amount', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150} />);
    expect(screen.getByTestId('reference-line').getAttribute('data-label')).toBe('avg ₱50.00');
  });

  it('fills bars with the chart-1 token', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150} />);
    expect(screen.getByTestId('bar-amount').getAttribute('data-fill')).toBe('var(--chart-1)');
  });

  it('uses MMM labels within a single year', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150} />);
    expect(labels()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('uses MMM yy labels across years', () => {
    render(
      <AnalyzerMonthlyTrend
        data={[
          { month: '2025-12', amount: 10, count: 1 },
          { month: '2026-01', amount: 20, count: 1 },
        ]}
        totalAmount={30}
      />
    );
    expect(labels()).toEqual(['Dec 25', 'Jan 26']);
  });
});
