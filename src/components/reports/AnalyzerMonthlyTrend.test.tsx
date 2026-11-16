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
  ReferenceLine: ({ y, label }: { y: number; label?: { value: string; fill?: string } }) =>
    React.createElement('div', {
      'data-testid': 'reference-line',
      'data-y': y,
      'data-label': label?.value,
      'data-label-fill': label?.fill,
    }),
}));

// Payloads the tooltip stub feeds to the real labelFormatter/formatter, so the
// tooltip copy is exercised instead of being stubbed away.
const tooltip = vi.hoisted(() => ({
  points: [] as { value: number; payload: { fullLabel: string; count: number } }[],
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: ({ content }: { content: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-tooltip' }, content),
  ChartTooltipContent: ({
    labelFormatter,
    formatter,
  }: {
    labelFormatter: (value: unknown, payload: unknown[]) => React.ReactNode;
    formatter: (value: unknown, name: string, item: unknown) => React.ReactNode;
  }) =>
    React.createElement(
      'div',
      null,
      tooltip.points.map((p, i) =>
        React.createElement(
          'div',
          { key: i, 'data-testid': `tooltip-point-${i}` },
          React.createElement('span', { 'data-testid': `tooltip-label-${i}` }, labelFormatter('raw', [{ payload: p.payload }])),
          formatter(p.value, 'amount', { payload: p.payload })
        )
      )
    ),
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

  it('draws the avg label in the foreground token so it stays legible over bars', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150} />);
    expect(screen.getByTestId('reference-line').getAttribute('data-label-fill')).toBe('var(--foreground)');
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

  it('builds full MMM yyyy tooltip labels from YYYY-MM without shifting months', () => {
    render(
      <AnalyzerMonthlyTrend
        data={[
          { month: '2025-12', amount: 10, count: 1 },
          { month: '2026-01', amount: 20, count: 1 },
        ]}
        totalAmount={30}
      />
    );
    const data = JSON.parse(screen.getByTestId('bar-chart').getAttribute('data-chart-data')!);
    expect(data.map((d: { fullLabel: string }) => d.fullLabel)).toEqual(['Dec 2025', 'Jan 2026']);
  });

  it('formats tooltip label, peso amount and singular/plural transaction count', () => {
    tooltip.points = [
      { value: 1234.5, payload: { fullLabel: 'Jan 2026', count: 1 } },
      { value: 0, payload: { fullLabel: 'Feb 2026', count: 0 } },
      { value: 50.5, payload: { fullLabel: 'Mar 2026', count: 3 } },
    ];
    try {
      render(<AnalyzerMonthlyTrend data={THREE} totalAmount={150.5} />);
      expect(screen.getByTestId('tooltip-label-0').textContent).toBe('Jan 2026');
      expect(screen.getByTestId('tooltip-point-0').textContent).toContain('₱1,234.50');
      expect(screen.getByTestId('tooltip-point-0').textContent).toContain('1 transaction');
      expect(screen.getByTestId('tooltip-point-0').textContent).not.toContain('1 transactions');
      expect(screen.getByTestId('tooltip-point-1').textContent).toContain('₱0.00');
      expect(screen.getByTestId('tooltip-point-1').textContent).toContain('0 transactions');
      expect(screen.getByTestId('tooltip-point-2').textContent).toContain('₱50.50');
      expect(screen.getByTestId('tooltip-point-2').textContent).toContain('3 transactions');
    } finally {
      tooltip.points = [];
    }
  });

  it('formats a non-round average to 2 decimals in the label', () => {
    render(<AnalyzerMonthlyTrend data={THREE} totalAmount={100} />);
    const line = screen.getByTestId('reference-line');
    expect(Number(line.getAttribute('data-y'))).toBeCloseTo(33.3333, 3);
    expect(line.getAttribute('data-label')).toBe('avg ₱33.33');
  });

  it('renders for exactly 2 months', () => {
    render(<AnalyzerMonthlyTrend data={THREE.slice(0, 2)} totalAmount={100} />);
    expect(screen.getByText('Monthly Trend')).toBeTruthy();
    expect(screen.getByTestId('reference-line').getAttribute('data-y')).toBe('50');
  });
});
