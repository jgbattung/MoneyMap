import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  useSpring: () => ({
    set: () => undefined,
    on: () => () => undefined,
  }),
  useTransform: () => ({
    on: (event, cb) => {
      if (event === 'change') cb('0.00');
      return () => undefined;
    },
  }),
}));

vi.mock('@/hooks/useNetWorth', () => ({
  useNetWorth: vi.fn(() => ({
    netWorth: 50000,
    monthlyChange: { amount: 1000, percentage: 2 },
    isLoading: false,
    error: null,
    refetch: () => undefined,
  })),
}));

vi.mock('@/lib/format', () => ({
  formatCurrency: (v) => v.toFixed(2),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }),
}));

vi.mock('lucide-react', () => ({
  ArrowUp: () => null,
  ArrowDown: () => null,
  ArrowRight: () => null,
  Eye: () => null,
  EyeOff: () => null,
  AlertCircle: () => null,
}));

import { TotalNetWorthCard } from './TotalNetWorthCard';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('minimal TotalNetWorthCard render', () => {
  it('renders without crashing', () => {
    try {
      const result = render(React.createElement(TotalNetWorthCard), { wrapper: createWrapper() });
      expect(result).toBeTruthy();
    } catch (e) {
      console.error('RENDER ERROR:', e);
      throw e;
    }
  });
});
