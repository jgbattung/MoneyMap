import type { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { toNumber } from "./util";

export type FlowRow = { accountId: string; date: Date; inflow: number; outflow: number };

/**
 * Money moving in and out of the accounts matching `accountWhere`, one row per account per
 * stored date (callers re-bucket by month / window in JS).
 * - inflow  = income + transfers in
 * - outflow = expenses (installment parents excluded; transfer fees are already expense rows
 *   so they are counted once) + transfers out
 * Transfers are internal moves, so they only ever appear as inflow/outflow on the accounts
 * involved, never as income or expense.
 */
export async function loadAccountFlows(
  userId: string,
  accountWhere: Prisma.FinancialAccountWhereInput,
  range: { gte: Date; lt?: Date }
): Promise<FlowRow[]> {
  const date = range.lt ? { gte: range.gte, lt: range.lt } : { gte: range.gte };
  const scoped = { ...accountWhere, userId };

  const [income, expenses, transfersIn, transfersOut] = await Promise.all([
    db.incomeTransaction.groupBy({
      by: ["accountId", "date"],
      where: { userId, account: scoped, date },
      _sum: { amount: true },
    }),
    db.expenseTransaction.groupBy({
      by: ["accountId", "date"],
      where: { userId, isInstallment: false, account: scoped, date },
      _sum: { amount: true },
    }),
    db.transferTransaction.groupBy({
      by: ["toAccountId", "date"],
      where: { userId, toAccount: scoped, date },
      _sum: { amount: true },
    }),
    db.transferTransaction.groupBy({
      by: ["fromAccountId", "date"],
      where: { userId, fromAccount: scoped, date },
      _sum: { amount: true },
    }),
  ]);

  return [
    ...income.map((r) => ({ accountId: r.accountId, date: r.date, inflow: toNumber(r._sum.amount), outflow: 0 })),
    ...transfersIn.map((r) => ({ accountId: r.toAccountId, date: r.date, inflow: r._sum.amount ?? 0, outflow: 0 })),
    ...expenses.map((r) => ({ accountId: r.accountId, date: r.date, inflow: 0, outflow: toNumber(r._sum.amount) })),
    ...transfersOut.map((r) => ({ accountId: r.fromAccountId, date: r.date, inflow: 0, outflow: r._sum.amount ?? 0 })),
  ];
}
