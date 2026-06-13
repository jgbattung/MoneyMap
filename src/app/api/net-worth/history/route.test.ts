import { describe, it, expect } from 'vitest';
import { computeCumulativeNetWorth } from '@/lib/net-worth-history';

describe('computeCumulativeNetWorth', () => {
  const window12 = [
    { year: 2024, month: 7 },
    { year: 2024, month: 8 },
    { year: 2024, month: 9 },
    { year: 2024, month: 10 },
    { year: 2024, month: 11 },
    { year: 2024, month: 12 },
    { year: 2025, month: 1 },
    { year: 2025, month: 2 },
    { year: 2025, month: 3 },
    { year: 2025, month: 4 },
    { year: 2025, month: 5 },
    { year: 2025, month: 6 },
  ];

  it('returns an empty array when windowMonths is empty', () => {
    const result = computeCumulativeNetWorth(1000, [], [], []);
    expect(result).toEqual([]);
  });

  it('returns initialBalance for every month when there are no transactions', () => {
    const result = computeCumulativeNetWorth(5000, [], [], window12);
    expect(result).toHaveLength(12);
    for (const entry of result) {
      expect(entry.netWorth).toBe(5000);
    }
  });

  it('accumulates income and expenses correctly across months', () => {
    const incomeRows = [
      { year: 2024, month: 7, total: 1000 },
      { year: 2024, month: 8, total: 2000 },
    ];
    const expenseRows = [
      { year: 2024, month: 7, total: 500 },
      { year: 2024, month: 9, total: 300 },
    ];

    const result = computeCumulativeNetWorth(0, incomeRows, expenseRows, window12);

    // July 2024: 0 + 1000 - 500 = 500
    expect(result[0].netWorth).toBe(500);
    // Aug 2024: 0 + (1000+2000) - 500 = 2500
    expect(result[1].netWorth).toBe(2500);
    // Sep 2024: 0 + 3000 - (500+300) = 2200
    expect(result[2].netWorth).toBe(2200);
    // Oct..Dec should be same as Sep (no new rows)
    expect(result[3].netWorth).toBe(2200);
  });

  it('includes rows from before the window in cumulative sum', () => {
    // Row from 2023 is before the window but must still be included
    const incomeRows = [{ year: 2023, month: 1, total: 10000 }];
    const result = computeCumulativeNetWorth(0, incomeRows, [], [{ year: 2025, month: 1 }]);
    expect(result[0].netWorth).toBe(10000);
  });

  it('rounds to 2 decimal places', () => {
    const incomeRows = [{ year: 2025, month: 1, total: 0.1 }];
    const expenseRows = [{ year: 2025, month: 1, total: 0.2 }];
    const result = computeCumulativeNetWorth(0, incomeRows, expenseRows, [{ year: 2025, month: 1 }]);
    expect(result[0].netWorth).toBe(Math.round((0.1 - 0.2) * 100) / 100);
  });

  it('produces correct month labels', () => {
    const result = computeCumulativeNetWorth(0, [], [], [{ year: 2025, month: 6 }]);
    expect(result[0].month).toBe('Jun 2025');
  });
});
