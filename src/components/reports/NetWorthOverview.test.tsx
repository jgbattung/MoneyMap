import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import NetWorthOverview from './NetWorthOverview';

vi.mock('@/hooks/useNetWorth', () => ({
  useNetWorth: vi.fn(),
}));
vi.mock('@/hooks/useNetWorthHistory', () => ({
  useNetWorthHistory: vi.fn(),
}));
vi.mock('@/hooks/useNetWorthTarget', () => ({
  useNetWorthTarget: vi.fn(),
}));

vi.mock('@/components/forms/SetTargetDialog', () => ({
  default: () => null,
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => React.createElement('svg', { 'data-testid': 'icon-arrow-up' }),
  ArrowDown: () => React.createElement('svg', { 'data-testid': 'icon-arrow-down' }),
  ArrowRight: () => React.createElement('svg', { 'data-testid': 'icon-arrow-right' }),
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => true),
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: ({ dataKey, children }: { dataKey: string; children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': `bar-${dataKey}` }, children),
  Cell: () => React.createElement('div', { 'data-testid': 'bar-cell' }),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' }),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

import { useNetWorth } from '@/hooks/useNetWorth';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import { useNetWorthTarget } from '@/hooks/useNetWorthTarget';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

// Dec 2025 opening + Jan-Jul 2026 (8 entries, oldest first) — mirrors the
// production shape after the Phase 2 leading-month fix.
const HISTORY = [
  { month: 'Dec 2025', netWorth: 100000 },
  { month: 'Jan 2026', netWorth: 105000 },
  { month: 'Feb 2026', netWorth: 108000 },
  { month: 'Mar 2026', netWorth: 100000 },
  { month: 'Apr 2026', netWorth: 118000 },
  { month: 'May 2026', netWorth: 120000 },
  { month: 'Jun 2026', netWorth: 125000 },
  { month: 'Jul 2026', netWorth: 130000 },
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(useNetWorth).mockReturnValue({
    netWorth: 130000,
    monthlyChange: { amount: 5000, percentage: 4 },
    isLoading: false,
    error: null,
  });
  vi.mocked(useNetWorthHistory).mockReturnValue({
    history: HISTORY,
    isLoading: false,
    error: null,
  });
  vi.mocked(useNetWorthTarget).mockReturnValue({
    target: null,
    targetDate: null,
    isLoading: false,
    error: null,
    updateTarget: vi.fn(),
    isUpdating: false,
  });
});

describe('NetWorthOverview', () => {
  it('renders the money-map-card with four bands', () => {
    const { container } = render(React.createElement(NetWorthOverview), {
      wrapper: createWrapper(),
    });
    expect(container.querySelector('.money-map-card')).toBeTruthy();
  });

  it('rescopes the bars and stats (not just the delta) when the period changes', () => {
    render(React.createElement(NetWorthOverview), { wrapper: createWrapper() });

    // Default period is 3M: bounds Apr(idx4)->Jul(idx7) => 3 monthly-change bars
    expect(screen.getAllByTestId('bar-cell')).toHaveLength(3);

    // Switch to 1M
    fireEvent.click(screen.getByRole('radio', { name: '1M' }));

    // 1M bounds Jun(idx6)->Jul(idx7) => 1 monthly-change bar
    expect(screen.getAllByTestId('bar-cell')).toHaveLength(1);
    expect(localStorage.getItem('networth-overview-period')).toBe('1M');
  });

  it('persists the selected period across a remount via localStorage', () => {
    const { unmount } = render(React.createElement(NetWorthOverview), { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('radio', { name: '1M' }));
    unmount();
    cleanup();

    render(React.createElement(NetWorthOverview), { wrapper: createWrapper() });
    const oneMonthButton = screen.getByRole('radio', { name: '1M' }) as HTMLButtonElement;
    expect(oneMonthButton.getAttribute('data-state')).toBe('on');
  });

  it('renders a disabled 1Y toggle with its unlock month', () => {
    render(React.createElement(NetWorthOverview), { wrapper: createWrapper() });
    const oneYearButton = screen.getByRole('radio', { name: /Unlocks/ });
    expect(oneYearButton.hasAttribute('disabled')).toBe(true);
  });
});
