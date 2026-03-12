import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TotalNetWorthCard } from './TotalNetWorthCard';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useNetWorth', () => ({
  useNetWorth: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatCurrency: (amount: number) =>
    amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}));

// Mock framer-motion.
// useReducedMotion returns true so the component calls
// setAnimatedText(formatCurrency(netWorth)) synchronously, bypassing animations.
// useSpring and useTransform still return MotionValue-like stubs because the
// second useEffect always subscribes to displayValue.on('change', ...).
vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  useSpring: () => ({
    set: () => undefined,
    on: () => () => undefined,
  }),
  useTransform: () => ({
    on: () => () => undefined,
  }),
}));

// Mock Skeleton to avoid CSS dependency
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowUp: () => React.createElement('svg', { 'data-testid': 'icon-arrow-up' }),
  ArrowDown: () => React.createElement('svg', { 'data-testid': 'icon-arrow-down' }),
  ArrowRight: () => React.createElement('svg', { 'data-testid': 'icon-arrow-right' }),
  Eye: () => React.createElement('svg', { 'data-testid': 'icon-eye' }),
  EyeOff: () => React.createElement('svg', { 'data-testid': 'icon-eye-off' }),
  AlertCircle: () => React.createElement('svg', { 'data-testid': 'icon-alert-circle' }),
}));

import { useNetWorth } from '@/hooks/useNetWorth';

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

/** Returns a fresh default hook return value for each test. */
function makeDefaultReturn() {
  return {
    netWorth: 150000,
    monthlyChange: { amount: 5000, percentage: 3.45 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  vi.mocked(useNetWorth).mockReturnValue(makeDefaultReturn());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TotalNetWorthCard', () => {

  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders skeleton placeholders while data is loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), isLoading: true });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });

    it('renders the "Total Net Worth" title during loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), isLoading: true });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Total Net Worth')).toBeTruthy();
    });

    it('renders the PHP currency label during loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), isLoading: true });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('PHP')).toBeTruthy();
    });

    it('does not render the eye toggle button during loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), isLoading: true });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: 'Toggle balance visibility' })).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('renders the AlertCircle icon when an error occurs', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), error: 'Failed to fetch net worth' });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-alert-circle')).toBeTruthy();
    });

    it('renders "Failed to load net worth" heading in the error state', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), error: 'Failed to fetch net worth' });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load net worth')).toBeTruthy();
    });

    it('renders the error message text from the hook', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), error: 'Network error' });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('renders a "Try again" button in the error state', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), error: 'Failed to fetch net worth' });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Try again')).toBeTruthy();
    });

    it('calls refetch when "Try again" button is clicked', () => {
      const refetch = vi.fn();
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), error: 'Failed to fetch net worth', refetch });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Try again'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('happy path — data loaded', () => {
    it('renders the "Total Net Worth" title', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Total Net Worth')).toBeTruthy();
    });

    it('renders the PHP currency label', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('PHP')).toBeTruthy();
    });

    it('renders the Eye icon (balance visible by default)', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-eye')).toBeTruthy();
    });

    it('renders the eye toggle button with correct aria-label', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: 'Toggle balance visibility' })).toBeTruthy();
    });

    it('renders a positive monthly change with ArrowUp icon', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: 5000, percentage: 3.45 },
      });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    });

    it('renders a negative monthly change with ArrowDown icon', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: -2000, percentage: -1.5 },
      });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();
    });

    it('renders a zero monthly change with ArrowRight icon', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: 0, percentage: 0 },
      });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByTestId('icon-arrow-right')).toBeTruthy();
    });

    it('renders the monthly change percentage in the pill badge', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: 5000, percentage: 3.45 },
      });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText(/3\.45%/)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('balance privacy toggle', () => {
    it('hides the net worth value and shows ***** when toggle is clicked', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: 'Toggle balance visibility' }));

      expect(screen.getByText('*****')).toBeTruthy();
    });

    it('hides the monthly change amount and shows *** when toggle is clicked', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: 'Toggle balance visibility' }));

      expect(screen.getByText('***')).toBeTruthy();
    });

    it('switches from Eye to EyeOff icon after hiding', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      fireEvent.click(screen.getByRole('button', { name: 'Toggle balance visibility' }));

      expect(screen.getByTestId('icon-eye-off')).toBeTruthy();
      expect(screen.queryByTestId('icon-eye')).toBeNull();
    });

    it('restores the Eye icon and reveals value when toggled back', () => {
      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      const toggleBtn = screen.getByRole('button', { name: 'Toggle balance visibility' });
      fireEvent.click(toggleBtn); // hide
      fireEvent.click(toggleBtn); // show again

      expect(screen.getByTestId('icon-eye')).toBeTruthy();
      expect(screen.queryByText('*****')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('pill badge CSS classes', () => {
    it('applies positive (success tint) classes for a positive monthly change', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: 5000, percentage: 3.45 },
      });

      const { container } = render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(container.querySelector('.bg-text-success\\/10')).toBeTruthy();
    });

    it('applies negative (error tint) classes for a negative monthly change', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: -2000, percentage: -1.5 },
      });

      const { container } = render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(container.querySelector('.bg-text-error\\/10')).toBeTruthy();
    });

    it('applies neutral classes for zero monthly change', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...makeDefaultReturn(),
        monthlyChange: { amount: 0, percentage: 0 },
      });

      const { container } = render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      expect(container.querySelector('.bg-secondary-400\\/10')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  describe('reduced motion path', () => {
    it('renders the formatted net worth text immediately when reduced motion is preferred', async () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...makeDefaultReturn(), netWorth: 150000 });

      render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });

      // useEffect runs after render — wait for the state update
      expect(await screen.findByText('150,000.00')).toBeTruthy();
    });
  });
});
