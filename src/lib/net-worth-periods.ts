/**
 * Pure period-resolution and derivation math for the Reports Net Worth
 * Overview. No React, no fetching - operates entirely on the history series
 * already fetched by `useNetWorthHistory`.
 */

export type Period = '1M' | '3M' | 'YEAR' | '1Y';

export interface HistoryPoint {
  month: string; // e.g. "Jul 2026" - matches `/api/net-worth/history` response shape
  netWorth: number;
}

export interface PeriodBounds {
  startIndex: number;
  endIndex: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthLabel(label: string): { year: number; month: number } {
  const [monthStr, yearStr] = label.split(' ');
  return { year: parseInt(yearStr, 10), month: MONTH_NAMES.indexOf(monthStr) };
}

const PERIOD_MONTHS_BACK: Record<Exclude<Period, 'YEAR'>, number> = {
  '1M': 1,
  '3M': 3,
  '1Y': 12,
};

/**
 * Resolves the start/end indices for a period against the history series.
 * Returns `null` when the required start month is not present in `history` -
 * this is the coverage gate that prevents fabricated periods. Never clamp a
 * missing start to index 0.
 */
export function resolvePeriodBounds(
  period: Period,
  history: HistoryPoint[],
  now: Date
): PeriodBounds | null {
  if (history.length === 0) return null;

  const endIndex = history.length - 1;

  if (period === 'YEAR') {
    const prevYear = now.getFullYear() - 1;
    const startIndex = history.findIndex((h) => {
      const { year, month } = parseMonthLabel(h.month);
      return year === prevYear && month === 11; // December, 0-indexed
    });
    return startIndex === -1 ? null : { startIndex, endIndex };
  }

  const monthsBack = PERIOD_MONTHS_BACK[period];
  const startIndex = endIndex - monthsBack;
  return startIndex < 0 ? null : { startIndex, endIndex };
}
