/**
 * Pure period-resolution and derivation math for the Reports Net Worth
 * Overview. No React, no fetching - operates entirely on the history series
 * already fetched by `useNetWorthHistory`.
 */

export type Period = '1M' | '3M' | '6M' | 'YEAR' | '1Y';

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
  '6M': 6,
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PeriodDelta {
  amount: number;
  percentage: number;
}

/**
 * Peso delta over the bounds, plus a percentage computed against a
 * balance-derived baseline (`currentNetWorth - amount`), mirroring
 * `src/lib/net-worth.ts:68`. The `totalInitialBalance` constant baked into
 * every history entry cancels out of the peso amount but would inflate a
 * naive percentage-of-start-value calculation across a roster change.
 */
export function computePeriodDelta(
  history: HistoryPoint[],
  bounds: PeriodBounds,
  currentNetWorth: number
): PeriodDelta {
  const amount = round2(history[bounds.endIndex].netWorth - history[bounds.startIndex].netWorth);
  const baseline = currentNetWorth - amount;
  const percentage = baseline !== 0 ? round2((amount / Math.abs(baseline)) * 100) : 0;
  return { amount, percentage };
}

export interface MonthlyChange {
  month: string;
  change: number;
}

/** First-difference series across the bounds - one entry per month after the opening point. */
export function computeMonthlyChanges(history: HistoryPoint[], bounds: PeriodBounds): MonthlyChange[] {
  const changes: MonthlyChange[] = [];
  for (let i = bounds.startIndex + 1; i <= bounds.endIndex; i++) {
    changes.push({
      month: history[i].month,
      change: round2(history[i].netWorth - history[i - 1].netWorth),
    });
  }
  return changes;
}

export interface PeriodStats {
  peak: { value: number; month: string };
  average: number;
  monthsUp: number;
  monthsTotal: number;
  streak: number;
}

/**
 * Derived stats for the bounds. `peak` is the maximum cumulative `netWorth`
 * level within bounds (scanned from `history`, NOT from `monthlyChanges` -
 * a level is not derivable from a first-difference series). `streak` counts
 * trailing consecutive positive months.
 */
export function computeStats(
  monthlyChanges: MonthlyChange[],
  history: HistoryPoint[],
  bounds: PeriodBounds
): PeriodStats {
  let peak = { value: history[bounds.startIndex].netWorth, month: history[bounds.startIndex].month };
  for (let i = bounds.startIndex; i <= bounds.endIndex; i++) {
    if (history[i].netWorth > peak.value) {
      peak = { value: history[i].netWorth, month: history[i].month };
    }
  }
  peak = { value: round2(peak.value), month: peak.month };

  const monthsTotal = monthlyChanges.length;
  const average = monthsTotal > 0
    ? round2(monthlyChanges.reduce((sum, m) => sum + m.change, 0) / monthsTotal)
    : 0;
  const monthsUp = monthlyChanges.filter((m) => m.change > 0).length;

  let streak = 0;
  for (let i = monthlyChanges.length - 1; i >= 0; i--) {
    if (monthlyChanges[i].change > 0) streak++;
    else break;
  }

  return { peak, average, monthsUp, monthsTotal, streak };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type TargetProjection =
  | { kind: 'met' }
  | { kind: 'insufficient-data' }
  | { kind: 'not-on-pace' }
  | { kind: 'on-pace'; date: Date; monthsOut: number };

/**
 * Hedged target-date projection. Uses the MEDIAN monthly change, never the
 * mean - the mean is dominated by a single outlier month in a short series.
 * Checked in this order: already met, then insufficient history, then a
 * non-positive trend, otherwise a projected date.
 */
export function projectTargetDate(
  monthlyChanges: MonthlyChange[],
  currentNetWorth: number,
  target: number,
  minMonths = 3
): TargetProjection {
  if (currentNetWorth >= target) return { kind: 'met' };
  if (monthlyChanges.length < minMonths) return { kind: 'insufficient-data' };

  const medianChange = median(monthlyChanges.map((m) => m.change));
  if (medianChange <= 0) return { kind: 'not-on-pace' };

  const remaining = target - currentNetWorth;
  const monthsOut = Math.ceil(remaining / medianChange);
  const date = new Date();
  date.setMonth(date.getMonth() + monthsOut);

  return { kind: 'on-pace', date, monthsOut };
}
