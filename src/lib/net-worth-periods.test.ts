import { describe, it, expect } from 'vitest';
import {
  resolvePeriodBounds,
  computePeriodDelta,
  computeMonthlyChanges,
  computeStats,
  type HistoryPoint,
} from './net-worth-periods';

describe('resolvePeriodBounds', () => {
  // Dec 2025 opening balance + Jan-Jul 2026 (8 entries, oldest first)
  const history: HistoryPoint[] = [
    { month: 'Dec 2025', netWorth: 100000 },
    { month: 'Jan 2026', netWorth: 105000 },
    { month: 'Feb 2026', netWorth: 108000 },
    { month: 'Mar 2026', netWorth: 112000 },
    { month: 'Apr 2026', netWorth: 118000 },
    { month: 'May 2026', netWorth: 120000 },
    { month: 'Jun 2026', netWorth: 125000 },
    { month: 'Jul 2026', netWorth: 130000 },
  ];
  const now = new Date('2026-07-23');

  it('resolves 1M to the last month back one index', () => {
    expect(resolvePeriodBounds('1M', history, now)).toEqual({ startIndex: 6, endIndex: 7 });
  });

  it('resolves 3M to three months back', () => {
    expect(resolvePeriodBounds('3M', history, now)).toEqual({ startIndex: 4, endIndex: 7 });
  });

  it('resolves YEAR to the December entry of the previous calendar year', () => {
    expect(resolvePeriodBounds('YEAR', history, now)).toEqual({ startIndex: 0, endIndex: 7 });
  });

  it('returns null for 1Y when 12 months of history is not available', () => {
    expect(resolvePeriodBounds('1Y', history, now)).toBeNull();
  });

  it('never clamps a missing start to index 0', () => {
    const shortHistory: HistoryPoint[] = [
      { month: 'Jun 2026', netWorth: 100 },
      { month: 'Jul 2026', netWorth: 105 },
    ];
    expect(resolvePeriodBounds('3M', shortHistory, now)).toBeNull();
  });

  it('returns null for every period with a 1-entry history', () => {
    const single: HistoryPoint[] = [{ month: 'Jul 2026', netWorth: 100 }];
    expect(resolvePeriodBounds('1M', single, now)).toBeNull();
    expect(resolvePeriodBounds('3M', single, now)).toBeNull();
    expect(resolvePeriodBounds('YEAR', single, now)).toBeNull();
    expect(resolvePeriodBounds('1Y', single, now)).toBeNull();
  });

  it('returns null for an empty history', () => {
    expect(resolvePeriodBounds('1M', [], now)).toBeNull();
  });
});

describe('computePeriodDelta', () => {
  const history: HistoryPoint[] = [
    { month: 'Jan 2026', netWorth: 100000 },
    { month: 'Feb 2026', netWorth: 90000 },
    { month: 'Mar 2026', netWorth: 105000 },
  ];

  it('computes the peso amount as end minus start', () => {
    const delta = computePeriodDelta(history, { startIndex: 0, endIndex: 2 }, 105000);
    expect(delta.amount).toBe(5000);
  });

  it('computes percentage against a balance-derived baseline', () => {
    // amount = 5000, baseline = 105000 - 5000 = 100000, pct = 5%
    const delta = computePeriodDelta(history, { startIndex: 0, endIndex: 2 }, 105000);
    expect(delta.percentage).toBe(5);
  });

  it('handles a negative delta', () => {
    const delta = computePeriodDelta(history, { startIndex: 0, endIndex: 1 }, 90000);
    expect(delta.amount).toBe(-10000);
  });

  it('guards divide-by-zero baseline to 0', () => {
    // amount = end - start such that currentNetWorth - amount === 0
    const flat: HistoryPoint[] = [
      { month: 'Jan 2026', netWorth: 0 },
      { month: 'Feb 2026', netWorth: 5000 },
    ];
    const delta = computePeriodDelta(flat, { startIndex: 0, endIndex: 1 }, 5000);
    expect(delta.percentage).toBe(0);
  });
});

describe('computeMonthlyChanges', () => {
  it('returns the first-difference series across bounds', () => {
    const history: HistoryPoint[] = [
      { month: 'Jan 2026', netWorth: 100000 },
      { month: 'Feb 2026', netWorth: 90000 },
      { month: 'Mar 2026', netWorth: 105000 },
    ];
    const changes = computeMonthlyChanges(history, { startIndex: 0, endIndex: 2 });
    expect(changes).toEqual([
      { month: 'Feb 2026', change: -10000 },
      { month: 'Mar 2026', change: 15000 },
    ]);
  });

  it('returns a single-entry series for a period of length 1', () => {
    const history: HistoryPoint[] = [
      { month: 'Jun 2026', netWorth: 100000 },
      { month: 'Jul 2026', netWorth: 103000 },
    ];
    const changes = computeMonthlyChanges(history, { startIndex: 0, endIndex: 1 });
    expect(changes).toEqual([{ month: 'Jul 2026', change: 3000 }]);
  });
});

describe('computeStats', () => {
  it('computes peak, average, monthsUp and streak for a mixed period', () => {
    const history: HistoryPoint[] = [
      { month: 'Jan 2026', netWorth: 100000 },
      { month: 'Feb 2026', netWorth: 90000 },
      { month: 'Mar 2026', netWorth: 105000 },
      { month: 'Apr 2026', netWorth: 112000 },
    ];
    const bounds = { startIndex: 0, endIndex: 3 };
    const changes = computeMonthlyChanges(history, bounds);
    const stats = computeStats(changes, history, bounds);

    expect(stats.peak).toEqual({ value: 112000, month: 'Apr 2026' });
    expect(stats.average).toBe(4000); // (-10000 + 15000 + 7000) / 3
    expect(stats.monthsUp).toBe(2);
    expect(stats.monthsTotal).toBe(3);
    expect(stats.streak).toBe(2); // Mar and Apr trailing positive
  });

  it('handles a period containing only negative months', () => {
    const history: HistoryPoint[] = [
      { month: 'Jan 2026', netWorth: 100000 },
      { month: 'Feb 2026', netWorth: 90000 },
      { month: 'Mar 2026', netWorth: 80000 },
    ];
    const bounds = { startIndex: 0, endIndex: 2 };
    const changes = computeMonthlyChanges(history, bounds);
    const stats = computeStats(changes, history, bounds);

    expect(stats.peak).toEqual({ value: 100000, month: 'Jan 2026' });
    expect(stats.average).toBe(-10000);
    expect(stats.monthsUp).toBe(0);
    expect(stats.streak).toBe(0);
  });

  it('handles a period of length 1', () => {
    const history: HistoryPoint[] = [
      { month: 'Jun 2026', netWorth: 100000 },
      { month: 'Jul 2026', netWorth: 103000 },
    ];
    const bounds = { startIndex: 0, endIndex: 1 };
    const changes = computeMonthlyChanges(history, bounds);
    const stats = computeStats(changes, history, bounds);

    expect(stats.monthsTotal).toBe(1);
    expect(stats.monthsUp).toBe(1);
    expect(stats.streak).toBe(1);
    expect(stats.average).toBe(3000);
  });
});
