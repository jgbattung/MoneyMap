import { db } from "@/lib/prisma";
import { EMPTY_FILTERS } from "@/lib/transaction-filters";
import {
  buildExpenseWhere,
  buildIncomeWhere,
  buildTransferWhere,
  type ParsedListParams,
} from "@/lib/transaction-where";
import { round2, toNumber } from "./util";

export type SearchKind = "expense" | "income" | "transfer" | "all";
export type SearchSort = "date" | "amount";

export const DEFAULT_TAKE = 20;
export const MAX_TAKE = 50;
const MAX_SKIP = 10000;

export interface SearchArgs {
  kind?: SearchKind;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  search?: string;
  category?: string;
  account?: string;
  tag?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: SearchSort;
  skip?: number;
  take?: number;
}

type Named = { id: string; name: string };

type Row = {
  date: Date;
  kind: "expense" | "income" | "transfer";
  name: string;
  description: string | null;
  amount: number;
  category: string;
  subcategory: string | null;
  account: string;
  tags: string[];
};

function findByName(list: Named[], name: string): Named | undefined {
  const wanted = name.trim().toLowerCase();
  return list.find((x) => x.name.toLowerCase() === wanted);
}

function amountString(value: number | undefined): string {
  return value === undefined ? "" : value.toFixed(2);
}

/**
 * Finds individual transactions (expense, income, transfer), newest or largest first, with the
 * total of ALL matches (not just the returned page). Names for category / account / tag are
 * matched case-insensitively against the user's own records only; an unknown name returns an
 * empty result with a note instead of silently dropping the filter. Expense rows never include
 * installment parents. Totals are reported per kind because summing income with expenses is
 * meaningless; `totalOfAllMatches` is set when a single kind was searched.
 */
export async function searchTransactions(userId: string, args: SearchArgs) {
  const kind = args.kind ?? "all";
  const sort = args.sort ?? "date";
  const take = Math.min(Math.max(args.take ?? DEFAULT_TAKE, 1), MAX_TAKE);
  const skip = Math.min(Math.max(args.skip ?? 0, 0), MAX_SKIP);
  const kinds = (kind === "all" ? ["expense", "income", "transfer"] : [kind]) as Array<
    "expense" | "income" | "transfer"
  >;

  const empty = (note: string) => ({
    currency: "PHP",
    kind,
    note,
    totalOfAllMatches: null as number | null,
    totals: {} as Record<string, { total: number; count: number }>,
    count: 0,
    hasMore: false,
    transactions: [] as Array<Omit<Row, "date"> & { date: string }>,
  });

  // Stage 1: resolve names to the user's own ids (only the lookups that were asked for).
  const [accounts, tags, expenseTypes, incomeTypes, transferTypes] = await Promise.all([
    args.account
      ? db.financialAccount.findMany({ where: { userId }, select: { id: true, name: true } })
      : Promise.resolve([] as Named[]),
    args.tag
      ? db.tag.findMany({ where: { userId }, select: { id: true, name: true } })
      : Promise.resolve([] as Named[]),
    args.category && kinds.includes("expense")
      ? db.expenseType.findMany({ where: { userId }, select: { id: true, name: true } })
      : Promise.resolve([] as Named[]),
    args.category && kinds.includes("income")
      ? db.incomeType.findMany({ where: { userId }, select: { id: true, name: true } })
      : Promise.resolve([] as Named[]),
    args.category && kinds.includes("transfer")
      ? db.transferType.findMany({ where: { userId }, select: { id: true, name: true } })
      : Promise.resolve([] as Named[]),
  ]);

  let accountId: string | undefined;
  if (args.account) {
    accountId = findByName(accounts, args.account)?.id;
    if (!accountId) return empty(`No account named "${args.account}".`);
  }

  let tagIds: string[] = [];
  if (args.tag) {
    const tag = findByName(tags, args.tag);
    if (!tag) return empty(`No tag named "${args.tag}".`);
    tagIds = [tag.id];
  }

  const categoryByKind: Record<"expense" | "income" | "transfer", string[] | null> = {
    expense: null,
    income: null,
    transfer: null,
  };
  let activeKinds = kinds;
  if (args.category) {
    const lists = { expense: expenseTypes, income: incomeTypes, transfer: transferTypes };
    activeKinds = kinds.filter((k) => {
      const hit = findByName(lists[k], args.category as string);
      categoryByKind[k] = hit ? [hit.id] : null;
      return hit !== undefined;
    });
    if (activeKinds.length === 0) return empty(`No category named "${args.category}".`);
  }

  const baseParams = (k: "expense" | "income" | "transfer"): ParsedListParams => ({
    search: args.search?.trim() ? args.search.trim() : undefined,
    // Transfers match an account on either side; expense/income match their own account.
    accountId,
    filters: {
      ...EMPTY_FILTERS,
      categoryIds: categoryByKind[k] ?? [],
      tagIds,
      amountMin: amountString(args.minAmount),
      amountMax: amountString(args.maxAmount),
      startDate: args.from ?? "",
      endDate: args.to ?? "",
    },
  });

  const window = skip + take + 1;
  const dateAmountOrder =
    sort === "amount"
      ? [{ amount: "desc" as const }, { date: "desc" as const }]
      : [{ date: "desc" as const }];

  // Stage 2: totals over the full filter plus the top `skip + take + 1` rows of each kind.
  const [expense, income, transfer] = await Promise.all([
    activeKinds.includes("expense")
      ? (async () => {
          const where = buildExpenseWhere(userId, baseParams("expense"));
          const [agg, rows] = await Promise.all([
            db.expenseTransaction.aggregate({ where, _sum: { amount: true }, _count: true }),
            db.expenseTransaction.findMany({
              where,
              orderBy: dateAmountOrder,
              take: window,
              select: {
                name: true, description: true, amount: true, date: true,
                account: { select: { name: true } },
                expenseType: { select: { name: true } },
                expenseSubcategory: { select: { name: true } },
                tags: { where: { userId }, select: { name: true } },
              },
            }),
          ]);
          return { agg, rows };
        })()
      : null,
    activeKinds.includes("income")
      ? (async () => {
          const where = buildIncomeWhere(userId, baseParams("income"));
          const [agg, rows] = await Promise.all([
            db.incomeTransaction.aggregate({ where, _sum: { amount: true }, _count: true }),
            db.incomeTransaction.findMany({
              where,
              orderBy: dateAmountOrder,
              take: window,
              select: {
                name: true, description: true, amount: true, date: true,
                account: { select: { name: true } },
                incomeType: { select: { name: true } },
                tags: { where: { userId }, select: { name: true } },
              },
            }),
          ]);
          return { agg, rows };
        })()
      : null,
    activeKinds.includes("transfer")
      ? (async () => {
          const where = buildTransferWhere(userId, baseParams("transfer"));
          const [agg, rows] = await Promise.all([
            db.transferTransaction.aggregate({ where, _sum: { amount: true }, _count: true }),
            db.transferTransaction.findMany({
              where,
              orderBy: dateAmountOrder,
              take: window,
              select: {
                name: true, notes: true, amount: true, date: true,
                fromAccount: { select: { name: true } },
                toAccount: { select: { name: true } },
                transferType: { select: { name: true } },
                tags: { where: { userId }, select: { name: true } },
              },
            }),
          ]);
          return { agg, rows };
        })()
      : null,
  ]);

  const merged: Row[] = [
    ...(expense?.rows ?? []).map((r) => ({
      date: r.date,
      kind: "expense" as const,
      name: r.name,
      description: r.description,
      amount: toNumber(r.amount),
      category: r.expenseType.name,
      subcategory: r.expenseSubcategory?.name ?? null,
      account: r.account.name,
      tags: r.tags.map((t) => t.name),
    })),
    ...(income?.rows ?? []).map((r) => ({
      date: r.date,
      kind: "income" as const,
      name: r.name,
      description: r.description,
      amount: toNumber(r.amount),
      category: r.incomeType.name,
      subcategory: null,
      account: r.account.name,
      tags: r.tags.map((t) => t.name),
    })),
    ...(transfer?.rows ?? []).map((r) => ({
      date: r.date,
      kind: "transfer" as const,
      name: r.name,
      description: r.notes,
      amount: r.amount,
      category: r.transferType.name,
      subcategory: null,
      account: `${r.fromAccount.name} -> ${r.toAccount.name}`,
      tags: r.tags.map((t) => t.name),
    })),
  ].sort((a, b) =>
    sort === "amount"
      ? b.amount - a.amount || b.date.getTime() - a.date.getTime()
      : b.date.getTime() - a.date.getTime()
  );

  const totals: Record<string, { total: number; count: number }> = {};
  if (expense) totals.expense = { total: round2(toNumber(expense.agg._sum.amount)), count: expense.agg._count };
  if (income) totals.income = { total: round2(toNumber(income.agg._sum.amount)), count: income.agg._count };
  if (transfer) totals.transfer = { total: round2(transfer.agg._sum.amount ?? 0), count: transfer.agg._count };

  const kindsSearched = Object.keys(totals);
  const count = kindsSearched.reduce((s, k) => s + totals[k].count, 0);

  return {
    currency: "PHP",
    kind,
    totalOfAllMatches: kindsSearched.length === 1 ? totals[kindsSearched[0]].total : null,
    totals,
    count,
    hasMore: merged.length > skip + take,
    transactions: merged.slice(skip, skip + take).map((r) => ({
      ...r,
      date: r.date.toISOString().slice(0, 10),
      amount: round2(r.amount),
    })),
  };
}
