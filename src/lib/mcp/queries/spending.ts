import { db } from "@/lib/prisma";
import { addMonths, currentPhMonth, monthKey, monthRange, resolveWindow } from "@/lib/mcp/dates";
import { round2, toNumber } from "./util";

export type SpendingGroupBy = "category" | "subcategory" | "tag" | "account";

const TRAILING_MONTHS = 3;

type Row = { group: string; month: string; amount: number };

/**
 * Spend per group per month (installment parents excluded), plus for the latest month in
 * the window each group's trailing 3-full-month average and the change against it. The tool
 * does not judge anomalies; it supplies the comparison.
 */
export async function getSpendingBreakdown(
  userId: string,
  args: { from?: string; to?: string; groupBy?: SpendingGroupBy; category?: string }
) {
  const groupBy = args.groupBy ?? "category";
  const window = resolveWindow(args);

  // Spend cannot exist in the future; clamp so "latest month" is a real month.
  const now = currentPhMonth();
  const months = window.months.filter((m) => m <= now);
  if (months.length === 0) {
    return { currency: "PHP", groupBy, window: { from: window.from, to: window.to }, groups: [] };
  }
  const latest = months[months.length - 1];
  const trailing = Array.from({ length: TRAILING_MONTHS }, (_, i) => addMonths(latest, -(i + 1)));
  const earliestNeeded = [months[0], ...trailing].reduce((a, b) => (a < b ? a : b));
  const dateRange = { gte: monthRange(earliestNeeded).gte, lt: monthRange(latest).lt };

  const [expenseTypes, earliestTx] = await Promise.all([
    db.expenseType.findMany({ where: { userId }, select: { id: true, name: true } }),
    db.expenseTransaction.findFirst({
      where: { userId, isInstallment: false },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  let categoryId: string | undefined;
  if (args.category) {
    const wanted = args.category.trim().toLowerCase();
    categoryId = expenseTypes.find((t) => t.name.toLowerCase() === wanted)?.id;
    if (!categoryId) {
      return {
        currency: "PHP",
        groupBy,
        window: { from: months[0], to: latest },
        groups: [],
        note: `No category named "${args.category}".`,
      };
    }
  }

  const where = {
    userId,
    isInstallment: false,
    date: dateRange,
    ...(categoryId ? { expenseTypeId: categoryId } : {}),
  };

  let rows: Row[] = [];
  const names = new Map<string, string>();

  if (groupBy === "category") {
    expenseTypes.forEach((t) => names.set(t.id, t.name));
    const groups = await db.expenseTransaction.groupBy({
      by: ["expenseTypeId", "date"],
      where,
      _sum: { amount: true },
    });
    rows = groups.map((g) => ({
      group: g.expenseTypeId,
      month: monthKey(g.date),
      amount: toNumber(g._sum.amount),
    }));
  } else if (groupBy === "subcategory") {
    const [subs, groups] = await Promise.all([
      db.expenseSubcategory.findMany({
        where: { userId },
        select: { id: true, name: true, expenseType: { select: { name: true } } },
      }),
      db.expenseTransaction.groupBy({
        by: ["expenseSubcategoryId", "date"],
        where,
        _sum: { amount: true },
      }),
    ]);
    subs.forEach((s) => names.set(s.id, `${s.expenseType.name} / ${s.name}`));
    rows = groups.map((g) => ({
      group: g.expenseSubcategoryId ?? "none",
      month: monthKey(g.date),
      amount: toNumber(g._sum.amount),
    }));
  } else if (groupBy === "account") {
    const [accounts, groups] = await Promise.all([
      db.financialAccount.findMany({ where: { userId }, select: { id: true, name: true } }),
      db.expenseTransaction.groupBy({
        by: ["accountId", "date"],
        where,
        _sum: { amount: true },
      }),
    ]);
    accounts.forEach((a) => names.set(a.id, a.name));
    rows = groups.map((g) => ({
      group: g.accountId,
      month: monthKey(g.date),
      amount: toNumber(g._sum.amount),
    }));
  } else {
    // Tags are many-to-many, so a transaction with several tags counts under each of them.
    const txs = await db.expenseTransaction.findMany({
      where: { ...where, tags: { some: { userId } } },
      select: { amount: true, date: true, tags: { where: { userId }, select: { id: true, name: true } } },
    });
    for (const tx of txs) {
      for (const tag of tx.tags) {
        names.set(tag.id, tag.name);
        rows.push({ group: tag.id, month: monthKey(tx.date), amount: toNumber(tx.amount) });
      }
    }
  }

  // Re-bucket by month in JS: cron-generated rows carry a time, so grouping by `date` in the
  // database yields several buckets per day.
  const byGroup = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const perMonth = byGroup.get(r.group) ?? new Map<string, number>();
    perMonth.set(r.month, (perMonth.get(r.month) ?? 0) + r.amount);
    byGroup.set(r.group, perMonth);
  }

  const dataStartsAt = earliestTx ? monthKey(earliestTx.date) : null;
  const trailingUsed = trailing.filter((m) => dataStartsAt !== null && m >= dataStartsAt);

  const groups = [...byGroup.entries()]
    .filter(([, perMonth]) => [...perMonth.values()].some((v) => v > 0))
    .map(([id, perMonth]) => {
      const monthly: Record<string, number> = {};
      for (const m of months) monthly[m] = round2(perMonth.get(m) ?? 0);
      const total = round2(months.reduce((s, m) => s + (perMonth.get(m) ?? 0), 0));

      const latestAmount = round2(perMonth.get(latest) ?? 0);
      let trailingAverage: number | null = null;
      let change: { amount: number; percent: number | null } | null = null;
      if (trailingUsed.length > 0) {
        trailingAverage = round2(
          trailingUsed.reduce((s, m) => s + (perMonth.get(m) ?? 0), 0) / trailingUsed.length
        );
        change = {
          amount: round2(latestAmount - trailingAverage),
          percent:
            trailingAverage > 0 ? round2(((latestAmount - trailingAverage) / trailingAverage) * 100) : null,
        };
      }

      return {
        name: names.get(id) ?? (id === "none" ? "(no subcategory)" : "(unknown)"),
        total,
        months: monthly,
        latestMonth: {
          month: latest,
          amount: latestAmount,
          trailing3MonthAverage: trailingAverage,
          changeVsAverage: change,
        },
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    currency: "PHP",
    groupBy,
    window: { from: months[0], to: latest },
    trailingMonthsUsed: trailingUsed,
    groups,
  };
}
