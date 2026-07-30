import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — every child section replaced with a simple marker div so this test
// stays focused on page-level composition (which sections render, in what
// order), not each section's own internals (already covered elsewhere).
// ---------------------------------------------------------------------------

vi.mock('@/components/shared/UserMenu', () => ({
  UserMenu: () => React.createElement('div', { 'data-testid': 'user-menu' }),
}));

vi.mock('@/components/dashboard/MobileHeroSummary', () => ({
  MobileHeroSummary: () => React.createElement('div', { 'data-testid': 'mobile-hero-summary' }),
}));

vi.mock('@/components/dashboard/NetWorthSection', () => ({
  default: () => React.createElement('div', { 'data-testid': 'net-worth-section' }),
}));

vi.mock('@/components/shared/BudgetStatus', () => ({
  BudgetStatus: () => React.createElement('div', { 'data-testid': 'budget-status' }),
}));

vi.mock('@/components/dashboard/RecentTransactions', () => ({
  default: () => React.createElement('div', { 'data-testid': 'recent-transactions' }),
}));

vi.mock('@/components/dashboard/AccountsSummary', () => ({
  AccountsSummary: () => React.createElement('div', { 'data-testid': 'accounts-summary' }),
}));

vi.mock('@/components/calendar/DashboardActivityStrip', () => ({
  DashboardActivityStrip: () => React.createElement('div', { 'data-testid': 'dashboard-activity-strip' }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import Dashboard from './page';

describe('Dashboard page', () => {
  it('renders the "Dashboard" heading', () => {
    render(React.createElement(Dashboard));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dashboard');
  });

  it('renders every existing section', () => {
    render(React.createElement(Dashboard));

    expect(screen.getByTestId('mobile-hero-summary')).toBeTruthy();
    expect(screen.getByTestId('net-worth-section')).toBeTruthy();
    expect(screen.getByTestId('budget-status')).toBeTruthy();
    expect(screen.getByTestId('recent-transactions')).toBeTruthy();
    expect(screen.getByTestId('accounts-summary')).toBeTruthy();
  });

  it('renders the activity strip', () => {
    render(React.createElement(Dashboard));
    expect(screen.getByTestId('dashboard-activity-strip')).toBeTruthy();
  });

  it('mounts the activity strip inside a money-map-card, after NetWorthSection and before the budgets/recent-transactions grid', () => {
    const { container } = render(React.createElement(Dashboard));

    const stripCard = screen.getByTestId('dashboard-activity-strip').closest('.money-map-card');
    expect(stripCard).toBeTruthy();

    const children = Array.from(container.firstElementChild!.children);
    const netWorthIndex = children.findIndex((el) => el.querySelector('[data-testid="net-worth-section"]') || el.getAttribute('data-testid') === 'net-worth-section');
    const stripIndex = children.findIndex((el) => el.contains(screen.getByTestId('dashboard-activity-strip')));
    const gridIndex = children.findIndex((el) => el.querySelector('[data-testid="budget-status"]'));

    expect(netWorthIndex).toBeGreaterThanOrEqual(0);
    expect(stripIndex).toBeGreaterThan(netWorthIndex);
    expect(gridIndex).toBeGreaterThan(stripIndex);
  });
});
