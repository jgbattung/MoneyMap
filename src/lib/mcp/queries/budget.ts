import { db } from "@/lib/prisma";
import { currentPhMonth, daysInMonth, monthRange, phToday } from "@/lib/mcp/dates";
import { round2, toNumber } from "./util";

/**
 * Budget vs spend per category for one month (default: current PH month), with a month-end
 * projection. The current month projects pro-rata over PH days elapsed; past months project
 * to what was actually spent. Installment parents are excluded from spend.
 */
export async function getBudgetStatus(userId: string, args: { month?: string }) {
  const now = currentPhMonth();
  const month = args.month ?? now;
  const range = monthRange(month);

  const [expenseTypes, spendingGroups] = await Promise.all([
    db.expenseType.findMany({
      where: { userId },
      select: { id: true, name: true, monthlyBudget: true },
    }),
    db.expenseTransaction.groupBy({
      by: ["expenseTypeId"],
      where: { userId, isInstallment: false, date: range },
      _sum: { amount: true },
    }),
  ]);

  const spentByType = new Map<string, number>();
  for (const g of spendingGroups) spentByType.set(g.expenseTypeId, toNumber(g._sum.amount));

  const isCurrent = month === now;
  const totalDays = daysInMonth(month);
  const daysElapsed = isCurrent ? Math.max(1, phToday().getUTCDate()) : totalDays;

  const budgeted: {
    category: string;
    budget: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    projectedMonthEnd: number;
    projectedOverBy: number;
  }[] = [];
  const unbudgeted: { category: string; spent: number }[] = [];

  for (const t of expenseTypes) {
    const spent = spentByType.get(t.id) ?? 0;
    const budget = toNumber(t.monthlyBudget);

    if (budget > 0) {
      const projected = isCurrent ? (spent / daysElapsed) * totalDays : spent;
      budgeted.push({
        category: t.name,
        budget: round2(budget),
        spent: round2(spent),
        remaining: round2(budget - spent),
        percentUsed: round2((spent / budget) * 100),
        projectedMonthEnd: round2(projected),
        projectedOverBy: round2(Math.max(0, projected - budget)),
      });
    } else if (spent > 0) {
      unbudgeted.push({ category: t.name, spent: round2(spent) });
    }
  }

  budgeted.sort((a, b) => b.percentUsed - a.percentUsed);
  unbudgeted.sort((a, b) => b.spent - a.spent);

  return {
    currency: "PHP",
    month,
    isCurrentMonth: isCurrent,
    daysElapsed,
    daysInMonth: totalDays,
    totalBudget: round2(budgeted.reduce((s, b) => s + b.budget, 0)),
    totalSpentOnBudgeted: round2(budgeted.reduce((s, b) => s + b.spent, 0)),
    budgeted,
    unbudgeted,
  };
}
