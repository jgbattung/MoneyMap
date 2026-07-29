import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  // The strip is a link into the calendar, not an expandable surface, so its
  // cells intentionally carry no selection behaviour. They are still rendered by
  // the shared CalendarDayCell, which is a <button> - these pin the resulting
  // shape so a change in either direction (wiring the cells up, or making them
  // non-interactive) shows up as a deliberate test change.
  describe('cell interactivity', () => {
    beforeEach(() => {
      mockUseCalendarSummary.mockReturnValue(activeSummary);
    });

    it('routes all navigation through the single "Open calendar" link', () => {
      render(<DashboardActivityStrip />);

      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('does nothing when a day cell is clicked', () => {
      const { container } = render(<DashboardActivityStrip />);

      const cells = container.querySelectorAll('button[data-slot="calendar-day-cell"]');
      expect(cells).toHaveLength(7);

      fireEvent.click(cells[0]);

      // No selection state, no drawer, no navigation - the markup is unchanged.
      expect(container.querySelectorAll('button[data-slot="calendar-day-cell"]')).toHaveLength(7);
      expect(container.querySelector('[data-selected]')).toBeNull();
      expect(screen.queryByTestId('calendar-day-detail')).toBeNull();
    });

    it('keeps its day cells in the tab order even though they have no action', () => {
      const { container } = render(<DashboardActivityStrip />);

      const cells = Array.from(
        container.querySelectorAll('button[data-slot="calendar-day-cell"]')
      );

      // KNOWN FALSE AFFORDANCE, pinned deliberately rather than fixed: every cell
      // is a focusable, hover-highlighted <button> with no behaviour, so the strip
      // adds seven dead tab stops to the dashboard. Raised to the user as a
      // non-blocking suggestion; asserted here so the current state is explicit
      // and a future fix has to update this test rather than pass silently.
      expect(cells).toHaveLength(7);
      for (const cell of cells) {
        expect(cell.getAttribute('tabindex')).toBeNull();
        expect(cell.hasAttribute('disabled')).toBe(false);
      }
    });
  });
});
