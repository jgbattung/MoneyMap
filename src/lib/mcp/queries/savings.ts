import { db } from "@/lib/prisma";
import { addMonths, currentPhMonth, monthKey, monthRange, resolveWindow } from "@/lib/mcp/dates";
import { loadAccountFlows } from "./flows";
import { round2, toNumber } from "./util";

export const SAVINGS_ACCOUNT_TYPES = ["SAVINGS", "INVESTMENT", "RETIREMENT"] as const;

const EXPENSE_AVERAGE_MONTHS = 3;

/**
 * Monthly inflow / outflow / net for SAVINGS, INVESTMENT and RETIREMENT accounts, grouped by
 * type then account, with current balances. Also returns the average monthly expenses over
 * the last 3 full PH months (all net-worth accounts) so emergency-fund coverage can be
 * computed by the caller.
 */
export async function getSavingsFlows(userId: string, args: { from?: string; to?: string }) {
  const window = resolveWindow(args);
  const months = window.months.filter((m) => m <= currentPhMonth());

  const now = currentPhMonth();
  const avgMonths = Array.from({ length: EXPENSE_AVERAGE_MONTHS }, (_, i) =>
    addMonths(now, -(EXPENSE_AVERAGE_MONTHS - i))
  );
  const avgRange = { gte: monthRange(avgMonths[0]).gte, lt: monthRange(avgMonths[avgMonths.length - 1]).lt };

  const [accounts, flows, expenseSum, earliestExpense] = await Promise.all([
    db.financialAccount.findMany({
      where: { userId, accountType: { in: [...SAVINGS_ACCOUNT_TYPES] } },
      select: { id: true, name: true, accountType: true, currentBalance: true },
      orderBy: { name: "asc" },
    }),
    months.length > 0
      ? loadAccountFlows(userId, { accountType: { in: [...SAVINGS_ACCOUNT_TYPES] } }, window.range)
      : Promise.resolve([]),
    db.expenseTransaction.aggregate({
      where: {
        userId,
        isInstallment: false,
        account: { addToNetWorth: true },
        date: avgRange,
      },
      _sum: { amount: true },
    }),
    db.expenseTransaction.findFirst({
      where: { userId, isInstallment: false },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  const perAccount = new Map<string, Map<string, { inflow: number; outflow: number }>>();
  for (const f of flows) {
    const month = monthKey(f.date);
    const byMonth = perAccount.get(f.accountId) ?? new Map();
    const cur = byMonth.get(month) ?? { inflow: 0, outflow: 0 };
    cur.inflow += f.inflow;
    cur.outflow += f.outflow;
    byMonth.set(month, cur);
    perAccount.set(f.accountId, byMonth);
  }

  const typeOrder = [...SAVINGS_ACCOUNT_TYPES] as string[];
  const byType = typeOrder
    .map((type) => {
      const typed = accounts.filter((a) => a.accountType === type);
      return {
        type,
        totalBalance: round2(typed.reduce((s, a) => s + toNumber(a.currentBalance), 0)),
        accounts: typed.map((a) => {
          const byMonth = perAccount.get(a.id);
          const rows = months.map((month) => {
            const cur = byMonth?.get(month) ?? { inflow: 0, outflow: 0 };
            return {
              month,
              inflow: round2(cur.inflow),
              outflow: round2(cur.outflow),
              net: round2(cur.inflow - cur.outflow),
            };
          });
          return {
            name: a.name,
            balance: round2(toNumber(a.currentBalance)),
            totalInflow: round2(rows.reduce((s, r) => s + r.inflow, 0)),
            totalOutflow: round2(rows.reduce((s, r) => s + r.outflow, 0)),
            totalNet: round2(rows.reduce((s, r) => s + r.net, 0)),
            months: rows,
          };
        }),
      };
    })
    .filter((t) => t.accounts.length > 0);

  // Only average over months that are on or after the first recorded expense.
  const firstMonth = earliestExpense ? monthKey(earliestExpense.date) : null;
  const monthsUsed = avgMonths.filter((m) => firstMonth !== null && m >= firstMonth).length;
  const averageMonthlyExpenses =
    monthsUsed > 0
      ? { amount: round2(toNumber(expenseSum._sum.amount) / monthsUsed), monthsUsed }
      : { amount: null as number | null, monthsUsed: 0 };

  return {
    currency: "PHP",
    window: { from: months[0] ?? window.from, to: months[months.length - 1] ?? window.to },
    byType,
    averageMonthlyExpenses,
  };
}
