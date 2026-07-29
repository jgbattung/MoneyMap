import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarDayBucket } from '@/types/calendar';

const max = { expense: 1000, income: 5000 };

function makeBucket(overrides: Partial<CalendarDayBucket> = {}): CalendarDayBucket {
  return {
    date: '2026-07-15',
    expense: 0,
    income: 0,
    transfer: 0,
    expenseCount: 0,
    incomeCount: 0,
    transferCount: 0,
    ...overrides,
  };
}

describe('CalendarDayCell', () => {
  it('renders two bars plus the transfer dot for a day with all three types', () => {
    const bucket = makeBucket({
      expense: 500,
      income: 2500,
      transfer: 100,
      expenseCount: 1,
      incomeCount: 1,
      transferCount: 1,
    });

    render(<CalendarDayCell day={new Date('2026-07-15T00:00:00.000Z')} bucket={bucket} max={max} />);

    expect(screen.getByTestId('income-bar')).toBeTruthy();
    expect(screen.getByTestId('expense-bar')).toBeTruthy();
    expect(screen.getByTestId('transfer-dot')).toBeTruthy();
  });

  it('renders neither bars nor the dot for a zero-activity day', () => {
    render(<CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} />);

    expect(screen.queryByTestId('income-bar')).toBeNull();
    expect(screen.queryByTestId('expense-bar')).toBeNull();
    expect(screen.queryByTestId('transfer-dot')).toBeNull();
  });

  it('renders no fill and no border on a zero-activity day', () => {
    const { container } = render(
      <CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} />
    );
    const button = container.querySelector('button')!;

    expect(button.className).not.toContain('bg-card/40');
    expect(button.className).toContain('border-transparent');
  });

  it('carries an explicit "+" sign for a positive net day', () => {
    const bucket = makeBucket({ income: 1000, expense: 200, incomeCount: 1, expenseCount: 1 });
    render(<CalendarDayCell day={new Date('2026-07-15T00:00:00.000Z')} bucket={bucket} max={max} />);

    expect(screen.getByText(/^\+₱800/)).toBeTruthy();
  });

  it('carries an explicit "-" sign for a negative net day', () => {
    const bucket = makeBucket({ income: 200, expense: 1000, incomeCount: 1, expenseCount: 1 });
    render(<CalendarDayCell day={new Date('2026-07-15T00:00:00.000Z')} bucket={bucket} max={max} />);

    expect(screen.getByText(/^-₱800/)).toBeTruthy();
  });

  it('applies the 6% floor so a very small amount still renders a visible bar', () => {
    const bucket = makeBucket({ expense: 1, expenseCount: 1 });
    render(<CalendarDayCell day={new Date('2026-07-15T00:00:00.000Z')} bucket={bucket} max={max} />);

    const bar = screen.getByTestId('expense-bar');
    expect(bar.style.width).toBe('6%');
  });

  it('keeps the net figure out of the mobile-visible markup (hidden until md:)', () => {
    const bucket = makeBucket({ income: 1000, expense: 0, incomeCount: 1 });
    render(<CalendarDayCell day={new Date('2026-07-15T00:00:00.000Z')} bucket={bucket} max={max} />);

    const net = screen.getByText(/^\+₱1,000/);
    expect(net.className).toContain('hidden');
    expect(net.className).toContain('md:block');
  });

  it('does not render a net figure at all for a zero-activity day', () => {
    render(<CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} />);

    expect(screen.queryByText(/₱/)).toBeNull();
  });

  it('carries "today" only via the day-number color, never a dot', () => {
    render(<CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} isToday />);

    expect(screen.queryByTestId('transfer-dot')).toBeNull();
    const dayNumber = screen.getByText('16');
    expect(dayNumber.className).toContain('text-primary');
  });

  it('dims the day number for a zero-activity, non-today day', () => {
    render(<CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} />);

    const dayNumber = screen.getByText('16');
    expect(dayNumber.className).toContain('text-muted-foreground/50');
  });

  it('fires onClick when clicked', () => {
    let clicked = false;
    render(
      <CalendarDayCell
        day={new Date('2026-07-16T00:00:00.000Z')}
        max={max}
        onClick={() => {
          clicked = true;
        }}
      />
    );

    screen.getByRole('button').click();
    expect(clicked).toBe(true);
  });

  describe('interactive prop', () => {
    it('renders a button by default', () => {
      const { container } = render(
        <CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} />
      );

      expect(container.querySelector('button[data-slot="calendar-day-cell"]')).toBeTruthy();
      expect(container.querySelector('div[data-slot="calendar-day-cell"]')).toBeNull();
    });

    it('renders a plain div with no button semantics when interactive is false', () => {
      const { container } = render(
        <CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} interactive={false} />
      );

      expect(container.querySelector('button[data-slot="calendar-day-cell"]')).toBeNull();
      const cell = container.querySelector('div[data-slot="calendar-day-cell"]') as HTMLElement;
      expect(cell).toBeTruthy();
      expect(cell.hasAttribute('type')).toBe(false);
      expect(cell.hasAttribute('tabindex')).toBe(false);
      expect(cell.hasAttribute('disabled')).toBe(false);
    });

    it('drops hover/focus-affordance classes when interactive is false', () => {
      const { container } = render(
        <CalendarDayCell day={new Date('2026-07-16T00:00:00.000Z')} max={max} interactive={false} />
      );

      const cell = container.querySelector('[data-slot="calendar-day-cell"]') as HTMLElement;
      expect(cell.className).not.toContain('hover:bg-accent/60');
      expect(cell.className).not.toContain('focus-visible:ring-2');
    });

    it('still renders its content (day number, bars, dot) when non-interactive', () => {
      const bucket = makeBucket({
        expense: 500,
        income: 2500,
        transfer: 100,
        expenseCount: 1,
        incomeCount: 1,
        transferCount: 1,
      });

      render(
        <CalendarDayCell
          day={new Date('2026-07-15T00:00:00.000Z')}
          bucket={bucket}
          max={max}
          interactive={false}
        />
      );

      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByTestId('income-bar')).toBeTruthy();
      expect(screen.getByTestId('expense-bar')).toBeTruthy();
      expect(screen.getByTestId('transfer-dot')).toBeTruthy();
    });

    it('does not forward onClick-adjacent button props onto the div', () => {
      let clicked = false;
      const { container } = render(
        <CalendarDayCell
          day={new Date('2026-07-16T00:00:00.000Z')}
          max={max}
          interactive={false}
          onClick={() => {
            clicked = true;
          }}
        />
      );

      const cell = container.querySelector('[data-slot="calendar-day-cell"]') as HTMLElement;
      cell.click();
      // Non-interactive cells intentionally do not wire up onClick even if passed.
      expect(clicked).toBe(false);
    });
  });
});
