import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ExpenseBreakdownChart from './ExpenseBreakdownChart';

// Mock useExpenseBreakdown hook
vi.mock('@/hooks/useExpenseBreakdown', () => ({
  useExpenseBreakdown: vi.fn(),
}));

// Mock recharts to avoid SVG rendering complexity in jsdom
vi.mock('recharts', () => ({
  Pie: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  PieChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie-chart-container' }, children),
  Cell: ({ fill }: { fill?: string }) =>
    React.createElement('div', { 'data-testid': 'pie-cell', style: { backgroundColor: fill } }),
}));

// Mock chart UI components
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

// Mock Shadcn Select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => React.createElement('div', { 'data-testid': 'select', 'data-value': value }, children),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('button', { 'data-testid': 'select-trigger', className }, children),
  SelectValue: () => React.createElement('span', { 'data-testid': 'select-value' }),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) =>
    React.createElement('div', { 'data-testid': `select-item-${value}`, role: 'option', onClick }, children),
}));

import { useExpenseBreakdown } from '@/hooks/useExpenseBreakdown';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

const defaultProps = {
  month: 3,
  year: 2024,
  onMonthChange: vi.fn(),
};

const mockBreakdownData = {
  month: 3,
  year: 2024,
  totalSpent: 10000,
  earliestMonth: 1,
  earliestYear: 2024,
  data: [
    { id: 'cat-1', name: 'Food', amount: 5000, percentage: 50 },
    { id: 'cat-2', name: 'Transport', amount: 3000, percentage: 30 },
    { id: 'cat-3', name: 'Utilities', amount: 2000, percentage: 20 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ExpenseBreakdownChart', () => {
  describe('loading state', () => {
    it('renders skeleton elements while loading', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(
        React.createElement(ExpenseBreakdownChart, defaultProps),
        { wrapper: createWrapper() }
      );

      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders "Expense Breakdown" title during loading', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: true,
        error: null,
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Expense Breakdown')).toBeTruthy();
    });

    it('applies money-map-card class during loading', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(
        React.createElement(ExpenseBreakdownChart, defaultProps),
        { wrapper: createWrapper() }
      );

      expect(container.querySelector('.money-map-card')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('renders error message when fetch fails', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: false,
        error: 'Failed to fetch expense breakdown',
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Failed to load expense breakdown')).toBeTruthy();
      expect(screen.getByText('Failed to fetch expense breakdown')).toBeTruthy();
    });

    it('still renders the month selector in error state', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: false,
        error: 'Network error',
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('select')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders empty state message when no data', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: null,
        isLoading: false,
        error: null,
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No expenses recorded for this month.')).toBeTruthy();
    });

    it('renders empty state when breakdown has empty data array', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: { ...mockBreakdownData, data: [], totalSpent: 0 },
        isLoading: false,
        error: null,
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No expenses recorded for this month.')).toBeTruthy();
    });
  });

  describe('happy path — data display', () => {
    beforeEach(() => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: mockBreakdownData,
        isLoading: false,
        error: null,
      });
    });

    it('renders "Expense Breakdown" title', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Expense Breakdown')).toBeTruthy();
    });

    it('renders expense category names in the legend', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/Food \(50\.0%\)/)).toBeTruthy();
      expect(screen.getByText(/Transport \(30\.0%\)/)).toBeTruthy();
      expect(screen.getByText(/Utilities \(20\.0%\)/)).toBeTruthy();
    });

    it('renders category names in the breakdown list', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      // Category names appear in the list section (the right side of breakdown rows)
      const foodElements = screen.getAllByText('Food');
      expect(foodElements.length).toBeGreaterThan(0);
    });

    it('renders formatted amounts in the breakdown list', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('₱5,000')).toBeTruthy();
      expect(screen.getByText('₱3,000')).toBeTruthy();
      expect(screen.getByText('₱2,000')).toBeTruthy();
    });

    it('renders percentage badges in the breakdown list', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('30%')).toBeTruthy();
      expect(screen.getByText('20%')).toBeTruthy();
    });

    it('renders the chart container', () => {
      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('chart-container')).toBeTruthy();
    });

    it('applies money-map-card class to root element', () => {
      const { container } = render(
        React.createElement(ExpenseBreakdownChart, defaultProps),
        { wrapper: createWrapper() }
      );

      expect(container.querySelector('.money-map-card')).toBeTruthy();
    });
  });

  describe('month selector', () => {
    it('renders the month select dropdown in happy path', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: mockBreakdownData,
        isLoading: false,
        error: null,
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('select')).toBeTruthy();
    });

    it('passes selected value as year-month format', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue({
        breakdown: mockBreakdownData,
        isLoading: false,
        error: null,
      });

      render(React.createElement(ExpenseBreakdownChart, defaultProps), {
        wrapper: createWrapper(),
      });

      const select = screen.getByTestId('select');
      expect(select.getAttribute('data-value')).toBe('2024-3');
    });
  });
});
