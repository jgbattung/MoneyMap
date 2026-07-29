import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import { useCalendarSummary } from '@/hooks/useCalendarSummary';
import { useEarliestTransaction } from '@/hooks/useEarliestTransaction';

vi.mock('@/hooks/useCalendarSummary', () => ({
  useCalendarSummary: vi.fn(),
}));

vi.mock('@/hooks/useEarliestTransaction', () => ({
  useEarliestTransaction: vi.fn(),
}));

const mockUseCalendarSummary = vi.mocked(useCalendarSummary);
const mockUseEarliestTransaction = vi.mocked(useEarliestTransaction);

const emptySummary = {
  data: { days: [], totals: { expense: 0, income: 0, net: 0 }, max: { expense: 0, income: 0 } },
  isLoading: false,
  error: null,
};

const activeSummary = {
  data: {
    days: [
      {
        date: '2026-07-15',
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

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEarliestTransaction.mockReturnValue({
    earliestMonth: null,
    earliestYear: null,
    isLoading: false,
  });
  mockUseCalendarSummary.mockReturnValue(emptySummary);
});

describe('CalendarView', () => {
  it('renders a month grid with day cells', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    const { container } = render(<CalendarView />);

    expect(container.querySelectorAll('[data-slot="calendar-day-cell"]').length).toBeGreaterThan(0);
  });

  it('renders skeletons while loading', () => {
    mockUseCalendarSummary.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<CalendarView />);

    expect(screen.getByTestId('calendar-skeleton')).toBeTruthy();
  });

  it('renders the empty state for a month with no activity', () => {
    mockUseCalendarSummary.mockReturnValue(emptySummary);

    render(<CalendarView />);

    expect(screen.getByText('No activity this month')).toBeTruthy();
  });

  it('does not render the empty state when the month has activity', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    expect(screen.queryByText('No activity this month')).toBeNull();
  });

  it('requests a new range when navigating to the next month', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    const callsBefore = mockUseCalendarSummary.mock.calls.length;
    const nextButton = screen.getByRole('button', { name: /Go to the Next Month/i });
    fireEvent.click(nextButton);

    expect(mockUseCalendarSummary.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCallArgs = mockUseCalendarSummary.mock.calls[mockUseCalendarSummary.mock.calls.length - 1];
    // start/end should have advanced past the args used on first render.
    const firstCallArgs = mockUseCalendarSummary.mock.calls[0];
    expect(lastCallArgs[0]).not.toBe(firstCallArgs[0]);
  });

  it('disables back-navigation at the earliest transaction month', () => {
    const now = new Date();
    mockUseEarliestTransaction.mockReturnValue({
      earliestMonth: now.getMonth() + 1,
      earliestYear: now.getFullYear(),
      isLoading: false,
    });
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    const prevButton = screen.getByRole('button', { name: /Go to the Previous Month/i });
    expect(prevButton.hasAttribute('disabled') || prevButton.getAttribute('aria-disabled') === 'true').toBe(
      true
    );
  });

  it('does not disable back-navigation while the earliest transaction is still loading', () => {
    mockUseEarliestTransaction.mockReturnValue({
      earliestMonth: null,
      earliestYear: null,
      isLoading: true,
    });
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    const prevButton = screen.getByRole('button', { name: /Go to the Previous Month/i });
    expect(prevButton.hasAttribute('disabled')).toBe(false);
  });

  it('renders the visible month totals header', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    expect(screen.getByText('+₱2,000')).toBeTruthy();
    expect(screen.getByText('-₱500')).toBeTruthy();
    expect(screen.getByTestId('calendar-month-net').textContent).toBe('+₱1,500');
  });
});
