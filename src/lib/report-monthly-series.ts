import type { TransactionAnalysisMonth } from "@/types/transaction-analysis";

interface DateGroup {
  date: Date;
  amountCents: number;
  count: number;
}

function monthToIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}

function indexToMonth(index: number): string {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
}

/**
 * Rolls per-date groups up into one entry per calendar month, ascending and
 * zero-filled between the first and last month.
 *
 * Months are the UTC year-month of each stored date. This relies on the
 * app-wide UTC+8 viewer assumption (the same one `report-date-range.ts` makes):
 * UTC-midnight form rows and 00:0x UTC installment-cron rows both land in the
 * correct month. Sums are done in integer centavos and divided once.
 *
 * The first/last month come from `startDate`/`endDate` (YYYY-MM-DD) when
 * given, otherwise from the earliest/latest bucket. With a missing bound and
 * no groups the result is empty.
 */
export function buildMonthlySeries(
  groups: DateGroup[],
  startDate?: string,
  endDate?: string
): TransactionAnalysisMonth[] {
  const buckets = new Map<string, { cents: number; count: number }>();
  for (const g of groups) {
    const key = g.date.toISOString().slice(0, 7);
    const b = buckets.get(key) ?? { cents: 0, count: 0 };
    b.cents += g.amountCents;
    b.count += g.count;
    buckets.set(key, b);
  }

  const keys = [...buckets.keys()].sort();
  const first = startDate ? startDate.slice(0, 7) : keys[0];
  const last = endDate ? endDate.slice(0, 7) : keys[keys.length - 1];
  if (!first || !last) return [];

  const series: TransactionAnalysisMonth[] = [];
  for (let i = monthToIndex(first); i <= monthToIndex(last); i++) {
    const month = indexToMonth(i);
    const b = buckets.get(month);
    series.push({ month, amount: (b?.cents ?? 0) / 100, count: b?.count ?? 0 });
  }
  return series;
}
