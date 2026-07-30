import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarDayDetail } from './CalendarDayDetail';
import { CalendarDayResponse } from '@/types/calendar';

const baseData: CalendarDayResponse = {
  transactions: [
    {
      id: 'exp-1',
      name: 'Groceries',
      amount: 120.5,
      type: 'EXPENSE',
      date: '2026-07-15T08:00:00.000Z',
      categoryName: 'Food',
      subcategoryName: 'Groceries',
      accountName: 'Main Checking',
      tags: [],
    },
    {
      id: 'inc-1',
      name: 'Salary',
      amount: 50000,
      type: 'INCOME',
      date: '2026-07-15T00:00:00.000Z',
      categoryName: 'Salary',
      accountName: 'Main Checking',
      tags: [],
    },
    {
      id: 'trf-1',
      name: 'Move to savings',
      amount: 1000,
      type: 'TRANSFER',
      date: '2026-07-15T09:00:00.000Z',
      categoryName: 'Internal',
      accountName: 'Main Checking',
      toAccountName: 'Savings',
      tags: [],
    },
  ],
  totals: { income: 50000, expense: 120.5, net: 49879.5 },
};

describe('CalendarDayDetail', () => {
  it('prompts to pick a day when no date is selected', () => {
    render(
      <CalendarDayDetail date={null} isLoading={false} onTransactionClick={() => {}} />
    );

    expect(screen.getByText('No day selected')).toBeTruthy();
  });

  it('renders loading skeletons', () => {
    render(
      <CalendarDayDetail date="2026-07-15" isLoading={true} onTransactionClick={() => {}} />
    );

    expect(screen.getByTestId('calendar-day-detail-skeleton')).toBeTruthy();
  });

  it('renders the error empty state', () => {
    render(
      <CalendarDayDetail
        date="2026-07-15"
        isLoading={false}
        error="Failed to fetch calendar day"
        onTransactionClick={() => {}}
      />
    );

    expect(screen.getByText("Couldn't load this day")).toBeTruthy();
  });

  it('renders the empty state for a day with no transactions', () => {
    render(
      <CalendarDayDetail
        date="2026-07-15"
        isLoading={false}
        data={{ transactions: [], totals: { income: 0, expense: 0, net: 0 } }}
        onTransactionClick={() => {}}
      />
    );

    expect(screen.getByText('No transactions')).toBeTruthy();
  });

  it('renders a row for each of the three transaction types', () => {
    render(
      <CalendarDayDetail date="2026-07-15" isLoading={false} data={baseData} onTransactionClick={() => {}} />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Groceries' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Salary' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Move to savings' })).toBeTruthy();
  });

  it('displays totals with correct signs', () => {
    render(
      <CalendarDayDetail date="2026-07-15" isLoading={false} data={baseData} onTransactionClick={() => {}} />
    );

    expect(screen.getByText('+₱50,000')).toBeTruthy();
    expect(screen.getByText('-₱121')).toBeTruthy(); // Math.round(120.5) => 121 (banker's rounding aside, JS rounds .5 up)
    expect(screen.getByTestId('calendar-day-net').textContent).toBe('+₱49,880');
  });

  it('labels each figure and recesses the summary block in a tonal step behind the rows', () => {
    const { container } = render(
      <CalendarDayDetail date="2026-07-15" isLoading={false} data={baseData} onTransactionClick={() => {}} />
    );

    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();
    expect(screen.getByText('Net')).toBeTruthy();

    const netValue = screen.getByTestId('calendar-day-net');
    // Values are quiet (text-xs font-medium), not shouting over the rows.
    expect(netValue.className).toContain('text-xs');
    expect(netValue.className).toContain('font-medium');
    expect(netValue.className).not.toContain('text-sm');
    expect(netValue.className).not.toContain('font-semibold');

    // Grouping is carried by a recessed tonal block, not by weight.
    const summaryBlock = netValue.closest('.bg-muted');
    expect(summaryBlock).toBeTruthy();
    expect(container.querySelector('.bg-muted.rounded-md')).toBeTruthy();
  });

  it('shows the full date heading', () => {
    render(
      <CalendarDayDetail date="2026-07-15" isLoading={false} data={baseData} onTransactionClick={() => {}} />
    );

    expect(screen.getByText('Wednesday, July 15, 2026')).toBeTruthy();
  });

  it('calls onTransactionClick with the id and type when a row is clicked', () => {
    const onTransactionClick = vi.fn();
    render(
      <CalendarDayDetail
        date="2026-07-15"
        isLoading={false}
        data={baseData}
        onTransactionClick={onTransactionClick}
      />
    );

    screen.getByRole('heading', { level: 3, name: 'Groceries' }).click();
    expect(onTransactionClick).toHaveBeenCalledWith('exp-1', 'EXPENSE');
  });
});
