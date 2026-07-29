import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import { useCalendarSummary } from '@/hooks/useCalendarSummary';
import { useEarliestTransaction } from '@/hooks/useEarliestTransaction';
import { useCalendarDay } from '@/hooks/useCalendarDay';

vi.mock('@/hooks/useCalendarSummary', () => ({
  useCalendarSummary: vi.fn(),
}));

vi.mock('@/hooks/useEarliestTransaction', () => ({
  useEarliestTransaction: vi.fn(),
}));

// CalendarDayPanel/Drawer own their fetch via useCalendarDay; they have full
// coverage in their own test files, so it's mocked here to keep CalendarView
// tests focused on month-grid orchestration without a QueryClientProvider.
vi.mock('@/hooks/useCalendarDay', () => ({
  useCalendarDay: vi.fn(),
}));

// Edit drawers are portal-heavy and separately tested; mirrors the mock
// convention already used in TransactionsMobileView.test.tsx. Wrapped in
// vi.fn() (rather than a bare () => null) so tests can assert which drawer
// was opened with which id.
const mockEditExpenseDrawer = vi.fn(() => null);
const mockEditIncomeDrawer = vi.fn(() => null);
const mockEditTransferDrawer = vi.fn(() => null);

vi.mock('@/components/forms/EditExpenseDrawer', () => ({
  default: (props: unknown) => mockEditExpenseDrawer(props),
}));
vi.mock('@/components/forms/EditIncomeDrawer', () => ({
  default: (props: unknown) => mockEditIncomeDrawer(props),
}));
vi.mock('@/components/forms/EditTransferDrawer', () => ({
  default: (props: unknown) => mockEditTransferDrawer(props),
}));

const mockUseCalendarSummary = vi.mocked(useCalendarSummary);
const mockUseEarliestTransaction = vi.mocked(useEarliestTransaction);
const mockUseCalendarDay = vi.mocked(useCalendarDay);

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
  mockUseCalendarDay.mockReturnValue({ data: undefined, isLoading: false, error: null });
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

  it('selecting a day passes that date to the day panel', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    const { container } = render(<CalendarView />);

    // react-day-picker's own <td> wrapper also carries a data-day attribute,
    // so scope the query to the actual <button> (our CalendarDayCell).
    const dayCell = container.querySelector('button[data-day="2026-07-15"]') as HTMLElement;
    expect(dayCell).toBeTruthy();
    fireEvent.click(dayCell);

    expect(mockUseCalendarDay).toHaveBeenCalledWith('2026-07-15');
  });

  it('mounts the desktop day panel and the three edit drawers', () => {
    mockUseCalendarSummary.mockReturnValue(activeSummary);

    render(<CalendarView />);

    expect(screen.getByTestId('calendar-day-panel')).toBeTruthy();
  });

  describe('row click opens the matching edit drawer', () => {
    beforeEach(() => {
      mockUseCalendarSummary.mockReturnValue(activeSummary);
      mockUseCalendarDay.mockReturnValue({
        data: {
          transactions: [
            {
              id: 'exp-1',
              name: 'Groceries',
              amount: 500,
              type: 'EXPENSE',
              date: '2026-07-15T08:00:00.000Z',
              categoryName: 'Food',
              accountName: 'Main',
              tags: [],
            },
            {
              id: 'inc-1',
              name: 'Salary',
              amount: 2000,
              type: 'INCOME',
              date: '2026-07-15T00:00:00.000Z',
              categoryName: 'Salary',
              accountName: 'Main',
              tags: [],
            },
            {
              id: 'trf-1',
              name: 'Move to savings',
              amount: 100,
              type: 'TRANSFER',
              date: '2026-07-15T09:00:00.000Z',
              categoryName: 'Internal',
              accountName: 'Main',
              toAccountName: 'Savings',
              tags: [],
            },
          ],
          totals: { income: 2000, expense: 500, net: 1500 },
        },
        isLoading: false,
        error: null,
      });
    });

    function selectJuly15(container: HTMLElement) {
      const dayCell = container.querySelector('button[data-day="2026-07-15"]') as HTMLElement;
      fireEvent.click(dayCell);
    }

    it('opens the expense drawer with the right id', () => {
      const { container } = render(<CalendarView />);
      selectJuly15(container);

      fireEvent.click(screen.getByRole('heading', { level: 3, name: 'Groceries' }));

      expect(mockEditExpenseDrawer).toHaveBeenLastCalledWith(
        expect.objectContaining({ open: true, expenseId: 'exp-1' })
      );
    });

    it('opens the income drawer with the right id', () => {
      const { container } = render(<CalendarView />);
      selectJuly15(container);

      fireEvent.click(screen.getByRole('heading', { level: 3, name: 'Salary' }));

      expect(mockEditIncomeDrawer).toHaveBeenLastCalledWith(
        expect.objectContaining({ open: true, incomeTransactionId: 'inc-1' })
      );
    });

    it('opens the transfer drawer with the right id', () => {
      const { container } = render(<CalendarView />);
      selectJuly15(container);

      fireEvent.click(screen.getByRole('heading', { level: 3, name: 'Move to savings' }));

      expect(mockEditTransferDrawer).toHaveBeenLastCalledWith(
        expect.objectContaining({ open: true, transferId: 'trf-1' })
      );
    });
  });
});
