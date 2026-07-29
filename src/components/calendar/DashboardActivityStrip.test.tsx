import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardActivityStrip } from './DashboardActivityStrip';
import { useCalendarSummary } from '@/hooks/useCalendarSummary';

vi.mock('@/hooks/useCalendarSummary', () => ({
  useCalendarSummary: vi.fn(),
}));

const mockUseCalendarSummary = vi.mocked(useCalendarSummary);

const activeSummary = {
  data: {
    days: [
      {
        date: '2026-07-29',
        expense: 500,
        income: 2000,
        transfer: 0,
        expenseCount: 1,
        incomeCount: 1,
        transferCount: 0,
      },
    ],
    totals: { expense: 500, income: 2000, net: 1500 },
    max: { expense: 500, income: 2000 },
  },
  isLoading: false,
  error: null,
};

const emptySummary = {
  data: { days: [], totals: { expense: 0, income: 0, net: 0 }, max: { expense: 0, income: 0 } },
  isLoading: false,
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCalendarSummary.mockReturnValue(emptySummary);
});

describe('DashboardActivityStrip', () => {
  it('requests a 7-day range ending today', () => {
    render(<DashboardActivityStrip />);

    const [start, end] = mockUseCalendarSummary.mock.calls[0];
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(diffDays).toBe(6);
  });

  it('renders seven day cells', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    const { container } = render(<DashboardActivityStrip />);

    expect(container.querySelectorAll('[data-slot="calendar-day-cell"]').length).toBe(7);
  });

  it('links to /transactions?view=calendar', () => {
    render(<DashboardActivityStrip />);

    const link = screen.getByRole('link', { name: 'Open calendar' });
    expect(link.getAttribute('href')).toBe('/transactions?view=calendar');
  });

  it('renders a skeleton while loading', () => {
    mockUseCalendarSummary.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<DashboardActivityStrip />);

    expect(screen.getByTestId('dashboard-strip-skeleton')).toBeTruthy();
  });

  it('renders the empty state for a week with no activity', () => {
    mockUseCalendarSummary.mockReturnValue(emptySummary);

    render(<DashboardActivityStrip />);

    expect(screen.getByText('No activity this week')).toBeTruthy();
  });

  it('renders the error state on fetch failure', () => {
    mockUseCalendarSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: 'Failed to fetch calendar summary',
    });

    render(<DashboardActivityStrip />);

    expect(screen.getByText("Couldn't load this week")).toBeTruthy();
  });

  it('shows the week net figure with correct sign', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<DashboardActivityStrip />);

    expect(screen.getByTestId('dashboard-strip-net').textContent).toBe('+₱1,500');
  });
});
