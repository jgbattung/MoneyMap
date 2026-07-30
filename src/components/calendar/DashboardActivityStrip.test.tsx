import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('links to /transactions?view=calendar via the Open Calendar button', () => {
    render(<DashboardActivityStrip />);

    const link = screen.getByRole('link', { name: 'Open Calendar' });
    expect(link.getAttribute('href')).toBe('/transactions?view=calendar');
    // Button-styled, not a bare text link.
    expect(link.querySelector('[data-slot="button"]')).toBeTruthy();
  });

  it('renders a skeleton while loading, bound to the same --cell-size as the loaded grid', () => {
    mockUseCalendarSummary.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { container } = render(<DashboardActivityStrip />);

    const skeletonGrid = screen.getByTestId('dashboard-strip-skeleton');
    expect(skeletonGrid.className).toContain('--cell-size:--spacing(11)');

    const skeletonCells = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletonCells.length).toBe(7);
    for (const cell of Array.from(skeletonCells)) {
      expect(cell.className).toContain('min-h-(--cell-size)');
      expect(cell.className).not.toContain('aspect-square');
    }
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

  it('shows the week net figure, labelled, with correct sign', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<DashboardActivityStrip />);

    expect(screen.getByText('Net this week')).toBeTruthy();
    expect(screen.getByTestId('dashboard-strip-net').textContent).toBe('+₱1,500');
  });

  it('uses the dashboard sibling heading convention and title-case name', () => {
    render(<DashboardActivityStrip />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Weekly Activity' });
    expect(heading.className).toContain('text-lg');
    expect(heading.className).toContain('font-semibold');
    expect(heading.className).toContain('text-foreground');
    expect(heading.className).toContain('tracking-tight');
  });

  describe('weekday row', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders a weekday-initial row aligned to the seven cells, derived from the actual window', () => {
      // 2026-07-29 is a Wednesday; the window is the 7 days ending on it.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'));
      mockUseCalendarSummary.mockReturnValue(activeSummary);

      render(<DashboardActivityStrip />);

      const weekdayRow = screen.getByTestId('dashboard-strip-weekdays');
      expect(weekdayRow.children).toHaveLength(7);
      expect(Array.from(weekdayRow.children).map((el) => el.textContent)).toEqual([
        'T', // Thu 7/23
        'F', // Fri 7/24
        'S', // Sat 7/25
        'S', // Sun 7/26
        'M', // Mon 7/27
        'T', // Tue 7/28
        'W', // Wed 7/29
      ]);
    });

    it('rotates the weekday row for a different "today"', () => {
      // A rolling window: pin "today" to a Monday instead and confirm the
      // row shifts rather than staying hardcoded to "Su Mo Tu...".
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
      mockUseCalendarSummary.mockReturnValue(activeSummary);

      render(<DashboardActivityStrip />);

      const weekdayRow = screen.getByTestId('dashboard-strip-weekdays');
      const letters = Array.from(weekdayRow.children).map((el) => el.textContent);
      expect(letters.at(-1)).toBe('M');
      expect(letters).toEqual(['T', 'W', 'T', 'F', 'S', 'S', 'M']);
    });
  });

  // The strip is a link into the calendar, not an expandable surface, so its
  // cells are intentionally non-interactive (rendered via CalendarDayCell's
  // `interactive={false}` path): no button semantics, no dead tab stops.
  describe('cell interactivity', () => {
    beforeEach(() => {
      mockUseCalendarSummary.mockReturnValue(activeSummary);
    });

    it('routes all navigation through the single "Open Calendar" link', () => {
      render(<DashboardActivityStrip />);

      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('renders cells as non-interactive divs, not buttons', () => {
      const { container } = render(<DashboardActivityStrip />);

      const cells = container.querySelectorAll('[data-slot="calendar-day-cell"]');
      expect(cells).toHaveLength(7);
      for (const cell of Array.from(cells)) {
        expect(cell.tagName).toBe('DIV');
      }
      expect(container.querySelectorAll('button[data-slot="calendar-day-cell"]')).toHaveLength(0);
    });

    it('does nothing when a day cell is clicked', () => {
      const { container } = render(<DashboardActivityStrip />);

      const cells = container.querySelectorAll('[data-slot="calendar-day-cell"]');
      fireEvent.click(cells[0]);

      expect(container.querySelectorAll('[data-slot="calendar-day-cell"]')).toHaveLength(7);
      expect(container.querySelector('[data-selected]')).toBeNull();
      expect(screen.queryByTestId('calendar-day-detail')).toBeNull();
    });

    it('removes the seven cells from the tab order (no dead tab stops)', () => {
      const { container } = render(<DashboardActivityStrip />);

      const cells = Array.from(container.querySelectorAll('[data-slot="calendar-day-cell"]'));
      expect(cells).toHaveLength(7);
      for (const cell of cells) {
        expect(cell.hasAttribute('tabindex')).toBe(false);
      }
    });
  });
});
