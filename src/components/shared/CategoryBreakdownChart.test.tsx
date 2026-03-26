import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useExpenseBreakdown', () => ({
  useExpenseBreakdown: vi.fn(),
}));

vi.mock('@/hooks/useIncomeBreakdown', () => ({
  useIncomeBreakdown: vi.fn(),
}));

// ---------------------------------------------------------------------------
// UI component mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

vi.mock('@/components/shared/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'empty-state' },
      React.createElement('p', null, title),
      React.createElement('p', null, description)
    ),
}));

// Recharts can't render in jsdom without ResizeObserver — stub it entirely.
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  Pie: ({ data }: { data?: { name: string; value: number }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'pie' },
      data?.map((d, i) =>
        React.createElement('div', { key: i, 'data-testid': `pie-segment-${d.name}` })
      )
    ),
  Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'chart-container' }, children),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import CategoryBreakdownChart from './CategoryBreakdownChart';
import { useExpenseBreakdown } from '@/hooks/useExpenseBreakdown';
import { useIncomeBreakdown } from '@/hooks/useIncomeBreakdown';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

const mockExpenseBreakdown = {
  data: [
    { name: 'Food', amount: 3000, percentage: 60 },
    { name: 'Transport', amount: 2000, percentage: 40 },
  ],
  totalSpent: 5000,
  earliestMonth: 1,
  earliestYear: 2024,
};

const mockIncomeBreakdown = {
  data: [
    { name: 'Salary', amount: 50000, percentage: 80 },
    { name: 'Freelance', amount: 12500, percentage: 20 },
  ],
  totalEarned: 62500,
  earliestMonth: 1,
  earliestYear: 2024,
};

function makeExpenseResult(overrides = {}) {
  return {
    breakdown: mockExpenseBreakdown,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

function makeIncomeResult(overrides = {}) {
  return {
    breakdown: mockIncomeBreakdown,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

function setupDefaultMocks() {
  vi.mocked(useExpenseBreakdown).mockReturnValue(makeExpenseResult());
  vi.mocked(useIncomeBreakdown).mockReturnValue(makeIncomeResult());
}

beforeEach(() => {
  vi.resetAllMocks();
  setupDefaultMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CategoryBreakdownChart', () => {
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton elements when expense hook is loading', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ isLoading: true, breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('renders skeleton elements when income hook is loading', () => {
      vi.mocked(useIncomeBreakdown).mockReturnValue(
        makeIncomeResult({ isLoading: true, breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders the expense error message when error is present', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ error: 'Network error', breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Failed to load expense breakdown')).toBeTruthy();
    });

    it('renders the income error message when error is present', () => {
      vi.mocked(useIncomeBreakdown).mockReturnValue(
        makeIncomeResult({ error: 'Network error', breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Failed to load income breakdown')).toBeTruthy();
    });

    it('renders the actual error detail text', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ error: 'Connection refused', breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Connection refused')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('renders EmptyState with correct title for empty expense data', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: { ...mockExpenseBreakdown, data: [] } })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('No expenses this month')).toBeTruthy();
    });

    it('renders EmptyState with correct title for empty income data', () => {
      vi.mocked(useIncomeBreakdown).mockReturnValue(
        makeIncomeResult({ breakdown: { ...mockIncomeBreakdown, data: [] } })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByText('No income this month')).toBeTruthy();
    });

    it('renders EmptyState with correct description for empty expense data', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: { ...mockExpenseBreakdown, data: [] } })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Expenses will appear here once recorded.')).toBeTruthy();
    });

    it('renders EmptyState with correct description for empty income data', () => {
      vi.mocked(useIncomeBreakdown).mockReturnValue(
        makeIncomeResult({ breakdown: { ...mockIncomeBreakdown, data: [] } })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Income will appear here once recorded.')).toBeTruthy();
    });

    it('renders EmptyState when breakdown is null', () => {
      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: null })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — expense data', () => {
    it('renders the chart container', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('chart-container')).toBeTruthy();
    });

    it('renders expense category names in the breakdown list', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Transport').length).toBeGreaterThan(0);
    });

    it('renders percentage values in the breakdown list', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      // 60% rounded = 60%, 40% rounded = 40%
      expect(screen.getByText('60%')).toBeTruthy();
      expect(screen.getByText('40%')).toBeTruthy();
    });

    it('renders currency amounts in the breakdown list', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      // formatCurrency renders ₱3,000 and ₱2,000
      expect(screen.getByText('₱3,000')).toBeTruthy();
      expect(screen.getByText('₱2,000')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — income data', () => {
    it('renders income category names in the breakdown list', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getAllByText('Salary').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Freelance').length).toBeGreaterThan(0);
    });

    it('renders income amounts in the breakdown list', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('₱50,000')).toBeTruthy();
      expect(screen.getByText('₱12,500')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('Show More / Show Less truncation (INITIAL_DISPLAY_COUNT = 10)', () => {
    it('does NOT render a Show More button when items <= 10', () => {
      // Default mock has 2 items — well below the limit
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText(/Show More/)).toBeNull();
      expect(screen.queryByText('Show Less')).toBeNull();
    });

    it('renders Show More button when items > 10', () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({
          breakdown: { ...mockExpenseBreakdown, data: manyItems },
        })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Show More (2 remaining)')).toBeTruthy();
    });

    it('shows exactly 10 items initially when items > 10', () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({
          breakdown: { ...mockExpenseBreakdown, data: manyItems },
        })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      // Items 1-10 visible in breakdown list; 11 and 12 are hidden
      expect(screen.queryByText('Category 11')).toBeNull();
      expect(screen.queryByText('Category 12')).toBeNull();
    });

    it('shows all items after clicking Show More', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({
          breakdown: { ...mockExpenseBreakdown, data: manyItems },
        })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('Show More (2 remaining)'));

      await waitFor(() => {
        expect(screen.getByText('Category 11')).toBeTruthy();
        expect(screen.getByText('Category 12')).toBeTruthy();
      });
    });

    it('shows "Show Less" button after expanding', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({
          breakdown: { ...mockExpenseBreakdown, data: manyItems },
        })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('Show More (2 remaining)'));

      await waitFor(() => {
        expect(screen.getByText('Show Less')).toBeTruthy();
      });
    });

    it('collapses back to 10 items when Show Less is clicked', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({
          breakdown: { ...mockExpenseBreakdown, data: manyItems },
        })
      );

      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('Show More (2 remaining)'));

      await waitFor(() => {
        expect(screen.getByText('Show Less')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Show Less'));

      await waitFor(() => {
        expect(screen.queryByText('Category 11')).toBeNull();
        expect(screen.queryByText('Category 12')).toBeNull();
        expect(screen.getByText('Show More (2 remaining)')).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('useEffect reset on prop changes', () => {
    it('resets showAll to false when type prop changes', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: { ...mockExpenseBreakdown, data: manyItems } })
      );

      const { rerender } = render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      // Expand the list
      fireEvent.click(screen.getByText('Show More (2 remaining)'));
      await waitFor(() => expect(screen.getByText('Show Less')).toBeTruthy());

      // Change type — this should reset showAll
      rerender(
        React.createElement(
          QueryClientProvider,
          {
            client: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          React.createElement(CategoryBreakdownChart, { type: 'income', month: 3, year: 2024 })
        )
      );

      // After type change, showAll is reset; income data has only 2 items so Show More won't appear
      await waitFor(() => {
        expect(screen.queryByText('Show Less')).toBeNull();
      });
    });

    it('resets showAll to false when month prop changes', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: { ...mockExpenseBreakdown, data: manyItems } })
      );

      const wrapper = createWrapper();
      const { rerender } = render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper }
      );

      // Expand
      fireEvent.click(screen.getByText('Show More (2 remaining)'));
      await waitFor(() => expect(screen.getByText('Show Less')).toBeTruthy());

      // Change month
      rerender(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 4, year: 2024 })
      );

      await waitFor(() => {
        expect(screen.queryByText('Show Less')).toBeNull();
      });
    });

    it('resets showAll to false when year prop changes', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) => ({
        name: `Category ${i + 1}`,
        amount: 100,
        percentage: 100 / 12,
      }));

      vi.mocked(useExpenseBreakdown).mockReturnValue(
        makeExpenseResult({ breakdown: { ...mockExpenseBreakdown, data: manyItems } })
      );

      const wrapper = createWrapper();
      const { rerender } = render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper }
      );

      // Expand
      fireEvent.click(screen.getByText('Show More (2 remaining)'));
      await waitFor(() => expect(screen.getByText('Show Less')).toBeTruthy());

      // Change year
      rerender(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2025 })
      );

      await waitFor(() => {
        expect(screen.queryByText('Show Less')).toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('legend rendering', () => {
    it('renders legend items for all categories (not truncated)', () => {
      render(
        React.createElement(CategoryBreakdownChart, { type: 'expense', month: 3, year: 2024 }),
        { wrapper: createWrapper() }
      );

      // Legend shows "Name (x.x%)" — check for the legend percentage format
      expect(screen.getByText('Food (60.0%)')).toBeTruthy();
      expect(screen.getByText('Transport (40.0%)')).toBeTruthy();
    });
  });
});
