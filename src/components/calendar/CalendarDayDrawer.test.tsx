import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarDayDrawer } from './CalendarDayDrawer';
import { useCalendarDay } from '@/hooks/useCalendarDay';

vi.mock('@/hooks/useCalendarDay', () => ({
  useCalendarDay: vi.fn(),
}));

const mockUseCalendarDay = vi.mocked(useCalendarDay);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CalendarDayDrawer', () => {
  it('calls useCalendarDay with the given date', () => {
    mockUseCalendarDay.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(
      <CalendarDayDrawer date="2026-07-15" open={true} onOpenChange={() => {}} onTransactionClick={() => {}} />
    );

    expect(mockUseCalendarDay).toHaveBeenCalledWith('2026-07-15');
  });

  it('renders the shared day detail body when open', () => {
    mockUseCalendarDay.mockReturnValue({
      data: { transactions: [], totals: { income: 0, expense: 0, net: 0 } },
      isLoading: false,
      error: null,
    });

    render(
      <CalendarDayDrawer date="2026-07-15" open={true} onOpenChange={() => {}} onTransactionClick={() => {}} />
    );

    expect(screen.getByTestId('calendar-day-drawer')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-detail')).toBeTruthy();
  });

  it('does not render drawer content when closed', () => {
    mockUseCalendarDay.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(
      <CalendarDayDrawer date={null} open={false} onOpenChange={() => {}} onTransactionClick={() => {}} />
    );

    expect(screen.queryByTestId('calendar-day-drawer')).toBeNull();
  });
});
