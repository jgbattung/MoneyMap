import { CalendarDayBucket } from "@/types/calendar";

export type CalendarBucketChannel = "expense" | "income" | "transfer";

/**
 * A single row shape returned by Prisma's `groupBy({ by: ['date'], _sum: { amount: true }, _count: true })`.
 */
export interface CalendarGroupByRow {
  date: Date;
  _sum: { amount: unknown };
  _count: number;
}

/**
 * Returns the UTC calendar-day key ("YYYY-MM-DD") for a Date.
 */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COUNT_KEY: Record<CalendarBucketChannel, keyof CalendarDayBucket> = {
  expense: "expenseCount",
  income: "incomeCount",
  transfer: "transferCount",
};

/**
 * Folds Prisma `groupBy(['date'])` rows for a single channel into a
 * Map<dayKey, CalendarDayBucket>, ADDING into any existing bucket for that
 * day rather than overwriting it.
 *
 * This exists because `date` columns hold two shapes: every user-facing
 * write path lands on exact UTC midnight, while the installment cron
 * (src/app/api/cron/process-installments/route.ts) writes a live
 * `new Date()`, so cron-generated rows carry a wall-clock time. A raw
 * `groupBy(['date'])` therefore emits a separate row per distinct
 * timestamp, which would silently drop cron-generated installment
 * payments from the day they actually belong to. Re-bucketing here by the
 * UTC day key, and summing collisions, is the fix.
 *
 * Amounts are normalised via `parseFloat(String(row._sum.amount ?? 0))` so
 * both the Decimal-as-string shape (expense/income) and the Float-as-number
 * shape (transfer, known schema debt) parse correctly.
 */
export function mergeDayBuckets(
  rows: CalendarGroupByRow[],
  channel: CalendarBucketChannel,
  map: Map<string, CalendarDayBucket>
): Map<string, CalendarDayBucket> {
  const countKey = COUNT_KEY[channel];

  for (const row of rows) {
    const key = toDayKey(row.date);
    const amount = parseFloat(String(row._sum.amount ?? 0));
    const count = row._count ?? 0;

    const existing: CalendarDayBucket = map.get(key) ?? {
      date: key,
      expense: 0,
      income: 0,
      transfer: 0,
      expenseCount: 0,
      incomeCount: 0,
      transferCount: 0,
    };

    existing[channel] += amount;
    (existing[countKey] as number) += count;

    map.set(key, existing);
  }

  return map;
}
