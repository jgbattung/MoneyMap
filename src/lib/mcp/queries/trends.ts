import { computeCumulativeNetWorth, getMonthlyFlowAggregates } from "@/lib/net-worth-history";
import { currentPhMonth, resolveWindow } from "@/lib/mcp/dates";
import { ratio, round2 } from "./util";

type Row = { year: number; month: number; total: number };

function key(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function sumByMonth(rows: Row[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r.year, r.month);
    map.set(k, (map.get(k) ?? 0) + r.total);
  }
  return map;
}

/**
 * Per-month income, expenses, savings and month-end net worth over accounts that count
 * toward net worth (installment parents excluded). Months before the user's first
 * transaction are never returned; `dataStartsAt` says where history begins.
 */
export async function getMonthlyTrends(userId: string, args: { from?: string; to?: string }) {
  const window = resolveWindow(args);
  const flows = await getMonthlyFlowAggregates(userId);
  const allRows = flows ? [...flows.incomeRows, ...flows.expenseRows] : [];

  if (!flows || allRows.length === 0) {
    return { currency: "PHP", dataStartsAt: null as string | null, months: [] };
  }

  const dataStartsAt = allRows
    .map((r) => key(r.year, r.month))
    .reduce((min, k) => (k < min ? k : min));

  const months = window.months.filter((m) => m >= dataStartsAt && m <= currentPhMonth());

  const incomeByMonth = sumByMonth(flows.incomeRows);
  const expenseByMonth = sumByMonth(flows.expenseRows);

  const netWorthEnd = computeCumulativeNetWorth(
    flows.totalInitialBalance,
    flows.incomeRows,
    flows.expenseRows,
    months.map((m) => ({ year: Number(m.slice(0, 4)), month: Number(m.slice(5, 7)) }))
  );

  return {
    currency: "PHP",
    dataStartsAt,
    months: months.map((month, i) => {
      const income = round2(incomeByMonth.get(month) ?? 0);
      const expenses = round2(expenseByMonth.get(month) ?? 0);
      const saved = round2(income - expenses);
      return {
        month,
        income,
        expenses,
        saved,
        savingsRate: ratio(saved, income),
        netWorthEnd: netWorthEnd[i].netWorth,
      };
    }),
  };
}
