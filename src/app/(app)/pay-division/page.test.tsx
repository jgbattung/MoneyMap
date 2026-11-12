/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

let plansState: any;

vi.mock('@/hooks/usePayPlansQuery', () => ({
  usePayPlansQuery: () => plansState,
}));

// Mock PageHeader to avoid pulling in UserMenu auth dependencies
vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => React.createElement('h1', null, title),
}));

// Tabs: a minimal controlled implementation that forwards onValueChange.
vi.mock('@/components/ui/tabs', () => {
  const Ctx = React.createContext<{ value: string; onValueChange: (v: string) => void }>({
    value: '',
    onValueChange: () => {},
  });
  return {
    Tabs: ({ value, onValueChange, children }: any) =>
      React.createElement(Ctx.Provider, { value: { value, onValueChange } }, children),
    TabsList: ({ children }: any) => React.createElement('div', { role: 'tablist' }, children),
    TabsTrigger: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx);
      return React.createElement(
        'button',
        { role: 'tab', 'aria-selected': ctx.value === value, onClick: () => ctx.onValueChange(value) },
        children,
      );
    },
    TabsContent: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx);
      return ctx.value === value ? React.createElement('div', { 'data-testid': `tab-${value}` }, children) : null;
    },
  };
});

// Children are isolated; NewDivisionCard exposes its onGoToPlans callback.
vi.mock('@/components/pay-division/NewDivisionCard', () => ({
  default: ({ onGoToPlans }: any) =>
    React.createElement('button', { onClick: onGoToPlans }, 'Go to Plans'),
}));
vi.mock('@/components/pay-division/RecentDivisions', () => ({
  default: () => React.createElement('div', { 'data-testid': 'recent-divisions' }),
}));
vi.mock('@/components/pay-division/PayPlanList', () => ({
  default: ({ plans, onSelect }: any) =>
    React.createElement(
      'ul',
      { 'data-testid': 'plan-list' },
      plans.map((p: any) => React.createElement('li', { key: p.id }, React.createElement('button', { onClick: () => onSelect(p) }, p.name))),
    ),
}));
vi.mock('@/components/pay-division/PayPlanSheet', () => ({
  default: ({ open, plan }: any) =>
    React.createElement('div', { 'data-testid': 'plan-sheet', 'data-open': String(open), 'data-plan': plan?.id ?? 'new' }),
}));
vi.mock('@/components/pay-division/PayPlanDrawer', () => ({
  default: ({ open, plan }: any) =>
    React.createElement('div', { 'data-testid': 'plan-drawer', 'data-open': String(open), 'data-plan': plan?.id ?? 'new' }),
}));

import PayDivision from './page';

const plan = { id: 'plan-1', name: 'Jun 15 plan' };

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

beforeEach(() => {
  plansState = { payPlans: [plan], isLoading: false, error: null };
  setWidth(1280);
});

describe('Pay Division page', () => {
  it('renders the header and opens on the Divide tab', () => {
    render(<PayDivision />);
    expect(screen.getByRole('heading', { name: 'Pay Division' })).toBeTruthy();
    expect(screen.getByTestId('tab-divide')).toBeTruthy();
    expect(screen.getByTestId('recent-divisions')).toBeTruthy();
    expect(screen.queryByTestId('tab-plans')).toBeNull();
  });

  it('the new-division empty state action switches to the Plans tab', () => {
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to Plans' }));
    expect(screen.getByTestId('tab-plans')).toBeTruthy();
    expect(screen.getByTestId('plan-list')).toBeTruthy();
  });

  it('switches tabs from the tab list', () => {
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    expect(screen.getByTestId('plan-list')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Divide' }));
    expect(screen.getByTestId('recent-divisions')).toBeTruthy();
  });

  it('shows the plans skeleton while loading', () => {
    plansState = { payPlans: [], isLoading: true, error: null };
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    expect(screen.getByTestId('plans-skeleton')).toBeTruthy();
  });

  it('shows the error block when plans fail to load', () => {
    plansState = { payPlans: [], isLoading: false, error: 'Failed to fetch pay plans' };
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    expect(screen.getByText('Failed to load plans')).toBeTruthy();
    expect(screen.getByText('Failed to fetch pay plans')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows an empty state whose action opens a new plan editor', () => {
    plansState = { payPlans: [], isLoading: false, error: null };
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    expect(screen.getByText('No plans yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create your first plan' }));
    expect(screen.getByTestId('plan-sheet').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('plan-sheet').getAttribute('data-plan')).toBe('new');
  });

  it('New plan opens the Sheet on md and up', () => {
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: 'New plan' }));
    expect(screen.getByTestId('plan-sheet').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('plan-drawer').getAttribute('data-open')).toBe('false');
  });

  it('selecting a plan on mobile opens the Drawer in edit mode', () => {
    setWidth(390);
    render(<PayDivision />);
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jun 15 plan' }));
    expect(screen.getByTestId('plan-drawer').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('plan-drawer').getAttribute('data-plan')).toBe('plan-1');
    expect(screen.getByTestId('plan-sheet').getAttribute('data-open')).toBe('false');
  });
});
