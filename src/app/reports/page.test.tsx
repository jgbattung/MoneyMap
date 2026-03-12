import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import Reports from './page';

// Mock useEarliestTransaction hook
vi.mock('@/hooks/useEarliestTransaction', () => ({
  useEarliestTransaction: vi.fn(),
}));

// Mock child components to isolate Reports page logic
vi.mock('@/components/shared/NetWorthCard', () => ({
  default: () => React.createElement('div', { 'data-testid': 'net-worth-card' }),
}));

vi.mock('@/components/shared/CategoryBreakdownChart', () => ({
  default: ({ type, month, year }: { type: string; month: number; year: number }) =>
    React.createElement('div', {
      'data-testid': `category-breakdown-chart-${type}`,
      'data-month': month,
      'data-year': year,
    }),
}));

vi.mock('@/components/shared/AnnualSummaryTable', () => ({
  default: () => React.createElement('div', { 'data-testid': 'annual-summary-table' }),
}));

// Mock Shadcn Select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) =>
    React.createElement('div', {
      'data-testid': 'select',
      'data-value': value,
      onClick: () => onValueChange && onValueChange('2024-3'),
    }, children),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('button', { 'data-testid': 'select-trigger', className }, children),
  SelectValue: () => React.createElement('span', { 'data-testid': 'select-value' }),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': `select-item-${value}`, role: 'option' }, children),
}));

// Mock Shadcn Tabs components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) =>
    React.createElement('div', { 'data-testid': 'tabs', 'data-default': defaultValue }, children),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'tabs-list', className }, children),
  TabsTrigger: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) =>
    React.createElement('button', { 'data-testid': `tab-trigger-${value}`, className }, children),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': `tab-content-${value}` }, children),
}));

import { useEarliestTransaction } from '@/hooks/useEarliestTransaction';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useEarliestTransaction).mockReturnValue({
    earliestMonth: 1,
    earliestYear: 2024,
    isLoading: false,
  });
});

describe('Reports page', () => {
  describe('rendering — static structure', () => {
    it('renders the "Reports" page heading', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByText('Reports')).toBeTruthy();
    });

    it('renders the NetWorthCard component', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('net-worth-card')).toBeTruthy();
    });

    it('renders the AnnualSummaryTable component', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('annual-summary-table')).toBeTruthy();
    });

    it('renders the "Category Breakdown" heading', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByText('Category Breakdown')).toBeTruthy();
    });

    it('renders the Tabs component with "expenses" as default', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      const tabs = screen.getByTestId('tabs');
      expect(tabs.getAttribute('data-default')).toBe('expenses');
    });

    it('renders Expenses tab trigger', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('tab-trigger-expenses')).toBeTruthy();
      expect(screen.getByText('Expenses')).toBeTruthy();
    });

    it('renders Income tab trigger', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('tab-trigger-income')).toBeTruthy();
      expect(screen.getByText('Income')).toBeTruthy();
    });

    it('renders CategoryBreakdownChart for expenses tab', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('category-breakdown-chart-expense')).toBeTruthy();
    });

    it('renders CategoryBreakdownChart for income tab', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('category-breakdown-chart-income')).toBeTruthy();
    });
  });

  describe('month selector', () => {
    it('renders the month select dropdown', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      expect(screen.getByTestId('select')).toBeTruthy();
    });

    it('initializes with current year-month as selected value', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      const now = new Date();
      const expectedValue = `${now.getFullYear()}-${now.getMonth() + 1}`;
      expect(screen.getByTestId('select').getAttribute('data-value')).toBe(expectedValue);
    });
  });

  describe('month generation — with earliest transaction', () => {
    it('passes current month/year to CategoryBreakdownChart by default', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });
      const now = new Date();
      const chart = screen.getByTestId('category-breakdown-chart-expense');
      expect(chart.getAttribute('data-month')).toBe(String(now.getMonth() + 1));
      expect(chart.getAttribute('data-year')).toBe(String(now.getFullYear()));
    });
  });

  describe('month selector — change handling', () => {
    it('updates the CategoryBreakdownChart when month is changed', () => {
      render(React.createElement(Reports), { wrapper: createWrapper() });

      // Simulate month select change by clicking the mocked Select which fires onValueChange('2024-3')
      const select = screen.getByTestId('select');
      fireEvent.click(select);

      const chart = screen.getByTestId('category-breakdown-chart-expense');
      expect(chart.getAttribute('data-month')).toBe('3');
      expect(chart.getAttribute('data-year')).toBe('2024');
    });
  });

  describe('money-map-card class on category breakdown container', () => {
    it('renders category breakdown section with money-map-card class', () => {
      const { container } = render(React.createElement(Reports), {
        wrapper: createWrapper(),
      });

      const cards = container.querySelectorAll('.money-map-card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
