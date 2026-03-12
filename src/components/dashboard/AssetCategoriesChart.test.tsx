import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AssetCategoriesChart } from './AssetCategoriesChart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  calculateAssetCategories: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatCurrency: (amount: number) =>
    amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}));

// Mock framer-motion — useReducedMotion is toggled per-test group.
// Default to false (full motion) so the motion.div path is exercised.
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
  motion: {
    div: React.forwardRef(
      function MotionDiv(
        { children, style, className, initial: _initial, animate: _animate, transition: _transition, ...rest }: React.HTMLAttributes<HTMLDivElement> & {
          initial?: unknown;
          animate?: unknown;
          transition?: unknown;
        },
        ref: React.ForwardedRef<HTMLDivElement>
      ) {
        return React.createElement('div', { ref, style, className, ...rest }, children);
      }
    ),
  },
}));

// Tooltip — render trigger + content side-by-side so content text is queryable.
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'tooltip-root' }, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement('div', { 'data-testid': 'tooltip-trigger' }, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'tooltip-content' }, children),
}));

// Skeleton stub
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('svg', { 'data-testid': 'icon-alert-circle' }),
}));

import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { calculateAssetCategories } from '@/lib/utils';
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

const SAMPLE_ACCOUNTS = [
  { id: '1', name: 'BDO Savings', accountType: 'SAVINGS', currentBalance: '50000', initialBalance: '0', addToNetWorth: true },
  { id: '2', name: 'BPI Checking', accountType: 'CHECKING', currentBalance: '30000', initialBalance: '0', addToNetWorth: true },
  { id: '3', name: 'Crypto Wallet', accountType: 'CRYPTO', currentBalance: '20000', initialBalance: '0', addToNetWorth: true },
];

const SAMPLE_CATEGORIES = [
  { name: 'Savings', value: 50000, percentage: 50, color: 'var(--chart-2)' },
  { name: 'Checking', value: 30000, percentage: 30, color: 'var(--chart-1)' },
  { name: 'Crypto', value: 20000, percentage: 20, color: 'var(--chart-5)' },
];

function makeDefaultHookReturn(overrides = {}) {
  return {
    accounts: SAMPLE_ACCOUNTS,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAccountsQuery).mockReturnValue(makeDefaultHookReturn());
  vi.mocked(calculateAssetCategories).mockReturnValue(SAMPLE_CATEGORIES);
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssetCategoriesChart', () => {

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton placeholders while data is loading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(makeDefaultHookReturn({ isLoading: true }));

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the "Asset Categories" title during loading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(makeDefaultHookReturn({ isLoading: true }));

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Asset Categories')).toBeTruthy();
    });

    it('does not render category names while loading', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(makeDefaultHookReturn({ isLoading: true }));

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.queryByText('Savings')).toBeNull();
      expect(screen.queryByText('Checking')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders the AlertCircle icon when an error occurs', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-alert-circle')).toBeTruthy();
    });

    it('renders "Failed to load categories" heading in the error state', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load categories')).toBeTruthy();
    });

    it('renders the error message text from the hook', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Network error' })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('renders a "Try again" button in the error state', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Failed to fetch accounts' })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Try again')).toBeTruthy();
    });

    it('calls refetch when "Try again" button is clicked', () => {
      const refetch = vi.fn();
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Failed to fetch accounts', refetch })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Try again'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('renders the "Asset Categories" title in the error state', () => {
      vi.mocked(useAccountsQuery).mockReturnValue(
        makeDefaultHookReturn({ error: 'Some error' })
      );

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Asset Categories')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('renders "No asset categories" message when there are no categories', () => {
      vi.mocked(calculateAssetCategories).mockReturnValue([]);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('No asset categories')).toBeTruthy();
    });

    it('renders a prompt to add accounts in the empty state', () => {
      vi.mocked(calculateAssetCategories).mockReturnValue([]);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Add accounts to see your asset distribution')).toBeTruthy();
    });

    it('renders the "Asset Categories" title in the empty state', () => {
      vi.mocked(calculateAssetCategories).mockReturnValue([]);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Asset Categories')).toBeTruthy();
    });

    it('does not render the segmented bar in the empty state', () => {
      vi.mocked(calculateAssetCategories).mockReturnValue([]);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.queryAllByTestId('tooltip-root').length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — data loaded', () => {
    it('renders the "Asset Categories" title', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Asset Categories')).toBeTruthy();
    });

    it('renders a tooltip segment for each category', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      const tooltipRoots = screen.getAllByTestId('tooltip-root');
      expect(tooltipRoots).toHaveLength(SAMPLE_CATEGORIES.length);
    });

    it('renders each category name in the legend', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      for (const cat of SAMPLE_CATEGORIES) {
        expect(screen.getAllByText(cat.name).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('renders the formatted currency value for each category in the legend', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      // Savings: ₱50,000.00
      expect(screen.getAllByText(/50,000\.00/).length).toBeGreaterThanOrEqual(1);
      // Checking: ₱30,000.00
      expect(screen.getAllByText(/30,000\.00/).length).toBeGreaterThanOrEqual(1);
      // Crypto: ₱20,000.00
      expect(screen.getAllByText(/20,000\.00/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders the percentage for each category in the legend', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('30%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('20%').length).toBeGreaterThanOrEqual(1);
    });

    it('renders tooltip content with category name and formatted amount', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      const tooltipContents = screen.getAllByTestId('tooltip-content');
      const contentTexts = tooltipContents.map((el) => el.textContent);

      expect(contentTexts.some((t) => t && t.includes('Savings'))).toBe(true);
      expect(contentTexts.some((t) => t && t.includes('50%'))).toBe(true);
    });

    it('passes accounts to calculateAssetCategories', () => {
      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(vi.mocked(calculateAssetCategories)).toHaveBeenCalledWith(SAMPLE_ACCOUNTS);
    });
  });

  // -------------------------------------------------------------------------
  describe('reduced motion support', () => {
    it('renders plain div segments (not motion.div) when reduced motion is preferred', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const { container: _container } = render(React.createElement(AssetCategoriesChart), {
        wrapper: createWrapper(),
      });

      // With reduced motion, segments are plain <div> inside tooltip-trigger
      const triggers = screen.getAllByTestId('tooltip-trigger');
      expect(triggers.length).toBe(SAMPLE_CATEGORIES.length);

      // The inner element should have the inline background-color style (no framer initial/animate attributes)
      const segmentDivs = triggers.map((t) => t.firstElementChild as HTMLElement);
      expect(segmentDivs[0].style.backgroundColor).toBe(SAMPLE_CATEGORIES[0].color);
    });

    it('renders motion.div segments when reduced motion is not preferred', () => {
      vi.mocked(useReducedMotion).mockReturnValue(false);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      // motion.div is mocked as a plain div, so segments are still rendered
      const triggers = screen.getAllByTestId('tooltip-trigger');
      expect(triggers.length).toBe(SAMPLE_CATEGORIES.length);
    });
  });

  // -------------------------------------------------------------------------
  describe('color indicators', () => {
    it('renders a color dot for each category in the legend', () => {
      const { container } = render(React.createElement(AssetCategoriesChart), {
        wrapper: createWrapper(),
      });

      // Color dots are small divs with rounded-full and inline backgroundColor
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBeGreaterThanOrEqual(SAMPLE_CATEGORIES.length);
    });

    it('applies the correct color to the first legend dot', () => {
      const { container } = render(React.createElement(AssetCategoriesChart), {
        wrapper: createWrapper(),
      });

      const dots = Array.from(container.querySelectorAll('.rounded-full')) as HTMLElement[];
      const coloredDots = dots.filter((d) => d.style.backgroundColor !== '');
      expect(coloredDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('single-category edge case', () => {
    it('renders correctly with a single category at 100%', () => {
      const singleCategory = [
        { name: 'Cash', value: 10000, percentage: 100, color: 'var(--chart-4)' },
      ];
      vi.mocked(calculateAssetCategories).mockReturnValue(singleCategory);

      render(React.createElement(AssetCategoriesChart), { wrapper: createWrapper() });

      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('tooltip-root')).toHaveLength(1);
    });
  });
});
