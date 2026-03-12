import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BudgetStatus } from './BudgetStatus';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useBudgetStatus', () => ({
  useBudgetStatus: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatCurrency: (amount: number) =>
    amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}));

// Mock framer-motion — useReducedMotion will be overridden per test group.
// motion.div renders as a plain div so progress bar markup is inspectable.
// useSpring and useTransform stubs are required to satisfy framer-motion
// internal initialization that runs as a side effect during import.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      ..._rest
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
      [key: string]: unknown;
    }) => React.createElement('div', { className, style }, children),
  },
  useReducedMotion: vi.fn(() => false),
  useSpring: () => ({
    set: () => undefined,
    on: () => () => undefined,
  }),
  useTransform: () => ({
    on: () => () => undefined,
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock Skeleton to avoid CSS dependency
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// Mock Button to keep tests simple
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    variant: _variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => React.createElement('button', { className }, children),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('svg', { 'data-testid': 'icon-alert-circle' }),
}));

// Mock next/link — render a plain <a> so "See All Budgets" is queryable
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement('a', { href }, children),
}));

import { useBudgetStatus } from '@/hooks/useBudgetStatus';
import { useReducedMotion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Helpers
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

function makeDefaultReturn(overrides = {}) {
  return {
    budgets: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

const mockBudgets = [
  {
    id: 'b-1',
    name: 'Food & Dining',
    monthlyBudget: 5000,
    spentAmount: 2000,
    progressPercentage: 40,
    isOverBudget: false,
  },
  {
    id: 'b-2',
    name: 'Transport',
    monthlyBudget: 3000,
    spentAmount: 3500,
    progressPercentage: 116,
    isOverBudget: true,
  },
  {
    id: 'b-3',
    name: 'Entertainment',
    monthlyBudget: 2000,
    spentAmount: 1700,
    progressPercentage: 85,
    isOverBudget: false,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BudgetStatus', () => {
  // -------------------------------------------------------------------------
  describe('header', () => {
    it('always renders the "Budget Status" title', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn());

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Budget Status')).toBeTruthy();
    });

    it('always renders the "This Month" label', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn());

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('This Month')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton elements while loading', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ isLoading: true }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render the budget summary line while loading', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ isLoading: true }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByText(/budgets on track/)).toBeNull();
    });

    it('does not render the error state while loading', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ isLoading: true }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByTestId('icon-alert-circle')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders the AlertCircle icon when an error occurs', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Failed to fetch budget status' })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-alert-circle')).toBeTruthy();
    });

    it('renders "Failed to load budget status" heading', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Network error' })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load budget status')).toBeTruthy();
    });

    it('renders the error message text from the hook', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Network error' })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('renders a "Try again" button', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Network error' })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Try again')).toBeTruthy();
    });

    it('calls refetch when "Try again" is clicked', () => {
      const refetch = vi.fn();
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Network error', refetch })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Try again'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('does not render budget items in the error state', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(
        makeDefaultReturn({ error: 'Network error' })
      );

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByText('See All Budgets')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('renders "No budget activity this month" when budgets array is empty', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: [] }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('No budget activity this month')).toBeTruthy();
    });

    it('renders helper text to guide user in empty state', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: [] }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Start tracking by adding budgets and expenses')).toBeTruthy();
    });

    it('does not render the summary line in empty state', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: [] }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByText(/budgets on track/)).toBeNull();
    });

    it('does not render the "See All Budgets" link in empty state', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: [] }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByText('See All Budgets')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — data loaded', () => {
    beforeEach(() => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: mockBudgets }));
    });

    it('renders each budget category name', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('Food & Dining')).toBeTruthy();
      expect(screen.getByText('Transport')).toBeTruthy();
      expect(screen.getByText('Entertainment')).toBeTruthy();
    });

    it('renders the formatted spent amount for each item', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      // Food & Dining: ₱2,000.00
      expect(screen.getAllByText(/₱2,000\.00/).length).toBeGreaterThan(0);
      // Transport: ₱3,500.00
      expect(screen.getAllByText(/₱3,500\.00/).length).toBeGreaterThan(0);
    });

    it('renders "of ₱X" line for items that have a budget', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText(/of ₱5,000\.00/)).toBeTruthy();
      expect(screen.getByText(/of ₱3,000\.00/)).toBeTruthy();
    });

    it('renders percentage text for items with a budget', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      // Food & Dining is 40%
      expect(screen.getByText('40%')).toBeTruthy();
      // Transport is 116% (capped display, but percentage text is raw value)
      expect(screen.getByText('116%')).toBeTruthy();
    });

    it('renders the "See All Budgets" link', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('See All Budgets')).toBeTruthy();
    });

    it('"See All Budgets" link points to /budgets', () => {
      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      const link = screen.getByText('See All Budgets').closest('a');
      expect(link?.getAttribute('href')).toBe('/budgets');
    });
  });

  // -------------------------------------------------------------------------
  describe('budget summary line (removed)', () => {
    it('does not render a summary line', () => {
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: mockBudgets }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.queryByText(/budgets on track/)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('progress bar color logic', () => {
    it('applies bg-text-success color when under budget and below 80%', () => {
      const underBudget = [
        {
          id: 'b-ok',
          name: 'Under Budget',
          monthlyBudget: 5000,
          spentAmount: 1000,
          progressPercentage: 20,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: underBudget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      expect(container.querySelector('.bg-text-success')).toBeTruthy();
    });

    it('applies bg-amber-400 color when under budget but at or above 80%', () => {
      const warningBudget = [
        {
          id: 'b-warn',
          name: 'Warning Budget',
          monthlyBudget: 2000,
          spentAmount: 1700,
          progressPercentage: 85,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: warningBudget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      expect(container.querySelector('.bg-amber-400')).toBeTruthy();
    });

    it('applies bg-text-error color when over budget', () => {
      const overBudget = [
        {
          id: 'b-over',
          name: 'Over Budget',
          monthlyBudget: 3000,
          spentAmount: 3500,
          progressPercentage: 116,
          isOverBudget: true,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: overBudget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      expect(container.querySelector('.bg-text-error')).toBeTruthy();
    });

    it('applies bg-text-error color when spending exists but no budget is set', () => {
      const noBudgetWithSpend = [
        {
          id: 'b-nobudget',
          name: 'No Budget Set',
          monthlyBudget: null,
          spentAmount: 500,
          progressPercentage: 0,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: noBudgetWithSpend }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      expect(container.querySelector('.bg-text-error')).toBeTruthy();
    });

    it('applies bg-secondary-400 color when no budget and no spending', () => {
      const noBudgetNoSpend = [
        {
          id: 'b-empty',
          name: 'Empty Category',
          monthlyBudget: null,
          spentAmount: 0,
          progressPercentage: 0,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: noBudgetNoSpend }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      expect(container.querySelector('.bg-secondary-400')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('no-budget item display', () => {
    it('shows "No budget set" when monthlyBudget is null', () => {
      const noBudget = [
        {
          id: 'b-nb',
          name: 'Unbudgeted',
          monthlyBudget: null,
          spentAmount: 0,
          progressPercentage: 0,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: noBudget }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('No budget set')).toBeTruthy();
    });

    it('shows "No budget set" when monthlyBudget is 0', () => {
      const zeroBudget = [
        {
          id: 'b-zero',
          name: 'Zero Budget',
          monthlyBudget: 0,
          spentAmount: 0,
          progressPercentage: 0,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: zeroBudget }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      expect(screen.getByText('No budget set')).toBeTruthy();
    });

    it('does not render the percentage text when no budget is set', () => {
      const noBudget = [
        {
          id: 'b-nb2',
          name: 'No Percentage',
          monthlyBudget: null,
          spentAmount: 0,
          progressPercentage: 0,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: noBudget }));

      render(React.createElement(BudgetStatus), { wrapper: createWrapper() });

      // progressPercentage is 0 — the element should not be rendered when hasNoBudget is true
      const percentElements = screen.queryAllByText('0%');
      expect(percentElements.length).toBe(0);
    });

    it('caps the progress bar width at 100% when over budget (reduced-motion path)', () => {
      // Use reduced-motion so the bar renders with inline style rather than animate prop
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const overBudget = [
        {
          id: 'b-cap',
          name: 'Capped Bar',
          monthlyBudget: 1000,
          spentAmount: 1500,
          progressPercentage: 150,
          isOverBudget: true,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: overBudget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      // In reduced-motion mode the component renders a static div with inline style.
      // progressWidth = Math.min(150, 100) = 100 → style.width = "100%"
      const progressBar = container.querySelector('.h-2.rounded-full.bg-text-error') as HTMLElement;
      expect(progressBar).toBeTruthy();
      expect(progressBar.style.width).toBe('100%');
    });
  });

  // -------------------------------------------------------------------------
  describe('reduced-motion support', () => {
    it('renders a static <div> progress bar (no motion.div) when reduced motion is preferred', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const budget = [
        {
          id: 'b-rm',
          name: 'Reduced Motion',
          monthlyBudget: 1000,
          spentAmount: 400,
          progressPercentage: 40,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: budget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      // In reduced-motion mode the component renders a plain <div> with inline style width.
      // The motion mock also renders a div, so we inspect style directly.
      const bar = container.querySelector('.h-2.rounded-full.bg-text-success') as HTMLElement;
      expect(bar).toBeTruthy();
      expect(bar.style.width).toBe('40%');
    });

    it('renders animated motion.div progress bar when reduced motion is not preferred', () => {
      vi.mocked(useReducedMotion).mockReturnValue(false);

      const budget = [
        {
          id: 'b-anim',
          name: 'Animated',
          monthlyBudget: 1000,
          spentAmount: 400,
          progressPercentage: 40,
          isOverBudget: false,
        },
      ];
      vi.mocked(useBudgetStatus).mockReturnValue(makeDefaultReturn({ budgets: budget }));

      const { container } = render(React.createElement(BudgetStatus), {
        wrapper: createWrapper(),
      });

      // motion.div mock forwards className and style, so the bar element is still present
      const bar = container.querySelector('.h-2.rounded-full.bg-text-success') as HTMLElement;
      expect(bar).toBeTruthy();
    });
  });
});
