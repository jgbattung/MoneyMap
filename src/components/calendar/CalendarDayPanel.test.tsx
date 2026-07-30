import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarDayPanel } from './CalendarDayPanel';
import { useCalendarDay } from '@/hooks/useCalendarDay';

vi.mock('@/hooks/useCalendarDay', () => ({
  useCalendarDay: vi.fn(),
}));

const mockUseCalendarDay = vi.mocked(useCalendarDay);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CalendarDayPanel', () => {
  it('calls useCalendarDay with the given date', () => {
    mockUseCalendarDay.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<CalendarDayPanel date="2026-07-15" onTransactionClick={() => {}} />);

    expect(mockUseCalendarDay).toHaveBeenCalledWith('2026-07-15');
  });

  it('renders the shared day detail body inside a sticky money-map-card', () => {
    mockUseCalendarDay.mockReturnValue({
      data: { transactions: [], totals: { income: 0, expense: 0, net: 0 } },
      isLoading: false,
      error: null,
    });

    render(<CalendarDayPanel date="2026-07-15" onTransactionClick={() => {}} />);

    const panel = screen.getByTestId('calendar-day-panel');
    expect(panel.className).toContain('money-map-card');
    expect(panel.className).toContain('sticky');
    expect(screen.getByTestId('calendar-day-detail')).toBeTruthy();
  });

  it('prompts to pick a day when date is null', () => {
    mockUseCalendarDay.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<CalendarDayPanel date={null} onTransactionClick={() => {}} />);

    expect(screen.getByText('No day selected')).toBeTruthy();
  });
});
