import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import NetWorthCard from './NetWorthCard';

// Mock hooks
vi.mock('@/hooks/useNetWorth', () => ({
  useNetWorth: vi.fn(),
}));

vi.mock('@/hooks/useNetWorthTarget', () => ({
  useNetWorthTarget: vi.fn(),
}));

// Mock SetTargetDialog to avoid deep dependency rendering
vi.mock('../forms/SetTargetDialog', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) =>
    open
      ? React.createElement('div', { 'data-testid': 'set-target-dialog' }, [
          React.createElement(
            'button',
            { key: 'close', onClick: () => onOpenChange(false) },
            'Close Dialog'
          ),
        ])
      : null,
}));

// Mock lucide-react icons used in NetWorthCard
vi.mock('lucide-react', () => ({
  ArrowUp: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-arrow-up', className }),
  ArrowDown: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-arrow-down', className }),
  ArrowRight: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-arrow-right', className }),
}));

import { useNetWorth } from '@/hooks/useNetWorth';
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

const defaultNetWorth = {
  netWorth: 150000,
  monthlyChange: { amount: 5000, percentage: 3.45 },
  isLoading: false,
  error: null,
};

const defaultTarget = {
  target: null,
  targetDate: null,
  isLoading: false,
  error: null,
  updateTarget: vi.fn(),
  isUpdating: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useNetWorth).mockReturnValue(defaultNetWorth);
  vi.mocked(useNetWorthTarget).mockReturnValue(defaultTarget);
});

describe('NetWorthCard', () => {
  describe('loading state', () => {
    it('renders skeleton elements while loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...defaultNetWorth, isLoading: true });
      vi.mocked(useNetWorthTarget).mockReturnValue({ ...defaultTarget, isLoading: false });

      const { container } = render(React.createElement(NetWorthCard), {
        wrapper: createWrapper(),
      });

      const skeletons = container.querySelectorAll('.bg-secondary-500');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders money-map-card during loading', () => {
      vi.mocked(useNetWorth).mockReturnValue({ ...defaultNetWorth, isLoading: true });

      const { container } = render(React.createElement(NetWorthCard), {
        wrapper: createWrapper(),
      });

      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });
  });

  describe('error state', () => {
    it('renders error message when net worth fetch fails', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...defaultNetWorth,
        isLoading: false,
        error: 'Failed to fetch net worth',
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load net worth')).toBeTruthy();
      expect(screen.getByText('Failed to fetch net worth')).toBeTruthy();
    });

    it('renders money-map-card in error state', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...defaultNetWorth,
        isLoading: false,
        error: 'Network error',
      });

      const { container } = render(React.createElement(NetWorthCard), {
        wrapper: createWrapper(),
      });

      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('money-map-card');
    });
  });

  describe('happy path — net worth display', () => {
    it('renders "Total Net Worth" label', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText('Total Net Worth')).toBeTruthy();
    });

    it('renders formatted net worth value', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      // 150000 formatted as 150,000.00
      expect(screen.getByText('150,000.00')).toBeTruthy();
    });

    it('renders PHP currency label', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText('PHP')).toBeTruthy();
    });

    it('renders "from last month" text', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText(/from last month/)).toBeTruthy();
    });

    it('renders ArrowUp icon for positive monthly change', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-arrow-up')).toBeTruthy();
    });

    it('renders ArrowDown icon for negative monthly change', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...defaultNetWorth,
        monthlyChange: { amount: -2000, percentage: 1.5 },
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-arrow-down')).toBeTruthy();
    });

    it('renders ArrowRight icon for zero monthly change', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...defaultNetWorth,
        monthlyChange: { amount: 0, percentage: 0 },
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByTestId('icon-arrow-right')).toBeTruthy();
    });

    it('renders positive change with + prefix', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText(/\+₱5,000\.00/)).toBeTruthy();
    });

    it('renders negative change with - prefix', () => {
      vi.mocked(useNetWorth).mockReturnValue({
        ...defaultNetWorth,
        monthlyChange: { amount: -2000, percentage: 1.5 },
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText(/-₱2,000\.00/)).toBeTruthy();
    });
  });

  describe('target button', () => {
    it('renders "Set target" button when no target is set', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: 'Set target' })).toBeTruthy();
    });

    it('renders "Edit target" button when target is set', () => {
      vi.mocked(useNetWorthTarget).mockReturnValue({
        ...defaultTarget,
        target: 500000,
        targetDate: null,
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: 'Edit target' })).toBeTruthy();
    });

    it('opens SetTargetDialog when target button is clicked', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });

      const button = screen.getByRole('button', { name: 'Set target' });
      fireEvent.click(button);

      expect(screen.getByTestId('set-target-dialog')).toBeTruthy();
    });
  });

  describe('progress section', () => {
    it('does not render progress section when no target is set', () => {
      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.queryByText(/Target:/)).toBeNull();
    });

    it('renders progress section when target is set', () => {
      vi.mocked(useNetWorthTarget).mockReturnValue({
        ...defaultTarget,
        target: 500000,
        targetDate: null,
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText(/Target: ₱500,000\.00/)).toBeTruthy();
    });

    it('renders progress percentage when target is set', () => {
      vi.mocked(useNetWorthTarget).mockReturnValue({
        ...defaultTarget,
        target: 500000,
        targetDate: null,
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      // 150000/500000 = 30%
      expect(screen.getByText('30.0%')).toBeTruthy();
    });

    it('renders target date when both target and targetDate are set', () => {
      vi.mocked(useNetWorthTarget).mockReturnValue({
        ...defaultTarget,
        target: 500000,
        targetDate: '2026-12-31T00:00:00.000Z',
      });

      render(React.createElement(NetWorthCard), { wrapper: createWrapper() });
      expect(screen.getByText(/by Dec 31, 2026/)).toBeTruthy();
    });
  });

  describe('money-map-card class', () => {
    it('applies money-map-card class to root element in happy path', () => {
      const { container } = render(React.createElement(NetWorthCard), {
        wrapper: createWrapper(),
      });
      // The first child is the fragment wrapper; the inner div has money-map-card
      const cardDiv = container.querySelector('.money-map-card');
      expect(cardDiv).toBeTruthy();
    });
  });
});
