import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  buildExpenseWhere,
  buildIncomeWhere,
  buildTransferWhere,
  parseListParams,
  type ParsedListParams,
} from "./transaction-where";
import { EMPTY_FILTERS } from "./transaction-filters";

function parse(qs: string, kind: "expense" | "income" | "transfer" = "expense") {
  return parseListParams(new URLSearchParams(qs), kind);
}

function ok(qs: string, kind: "expense" | "income" | "transfer" = "expense"): ParsedListParams {
  const result = parse(qs, kind);
  if (!result.success) throw new Error("expected success: " + result.error.message);
  return result.data;
}

describe("parseListParams", () => {
  it("returns empty filters for no params", () => {
    expect(ok("")).toEqual({
      skip: undefined,
      take: undefined,
      search: undefined,
      accountId: undefined,
      filters: EMPTY_FILTERS,
    });
  });

  it("caps skip and take", () => {
    const data = ok("skip=999999&take=5000");
    expect(data.skip).toBe(10000);
    expect(data.take).toBe(100);
    expect(ok("skip=0&take=15")).toMatchObject({ skip: 0, take: 15 });
  });

  it("rejects non-numeric skip/take", () => {
    expect(parse("skip=abc").success).toBe(false);
    expect(parse("take=-1").success).toBe(false);
  });

  it("treats blank search as unset and keeps real search", () => {
    expect(ok("search=%20%20").search).toBeUndefined();
    expect(ok("search=food").search).toBe("food");
  });

  it("splits, trims and drops empty ids", () => {
    const data = ok("accountIds=a, b ,,c&tagIds=t1&categoryIds=c1,c2");
    expect(data.filters.accountIds).toEqual(["a", "b", "c"]);
    expect(data.filters.tagIds).toEqual(["t1"]);
    expect(data.filters.categoryIds).toEqual(["c1", "c2"]);
  });

  it("rejects more than 50 ids and accepts exactly 50", () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `id${i}`).join(",");
    expect(parse(`tagIds=${ids(51)}`).success).toBe(false);
    expect(parse(`tagIds=${ids(50)}`).success).toBe(true);
  });

  it("validates amounts", () => {
    expect(ok("amountMin=10&amountMax=20.5").filters).toMatchObject({
      amountMin: "10",
      amountMax: "20.5",
    });
    expect(parse("amountMin=abc").success).toBe(false);
    expect(parse("amountMin=-5").success).toBe(false);
    expect(parse("amountMax=1.234").success).toBe(false);
    expect(parse("amountMin=1e5").success).toBe(false);
  });

  it("rejects reversed amount range but allows equal", () => {
    expect(parse("amountMin=10&amountMax=5").success).toBe(false);
    expect(parse("amountMin=9&amountMax=10").success).toBe(true);
    expect(parse("amountMin=5&amountMax=5").success).toBe(true);
  });

  it("validates dates are real calendar dates", () => {
    expect(ok("startDate=2026-02-28&endDate=2026-03-01").filters).toMatchObject({
      startDate: "2026-02-28",
      endDate: "2026-03-01",
    });
    expect(parse("startDate=2026-13-01").success).toBe(false);
    expect(parse("startDate=2026-02-30").success).toBe(false);
    expect(parse("endDate=26-01-01").success).toBe(false);
    expect(parse("endDate=garbage").success).toBe(false);
  });

  it("rejects reversed date range but allows same day", () => {
    expect(parse("startDate=2026-02-02&endDate=2026-02-01").success).toBe(false);
    expect(parse("startDate=2026-02-01&endDate=2026-02-01").success).toBe(true);
  });

  it("ignores cross-kind account params", () => {
    const qs = "accountIds=a&fromAccountIds=f&toAccountIds=t";
    const expense = ok(qs, "expense").filters;
    expect(expense.accountIds).toEqual(["a"]);
    expect(expense.fromAccountIds).toEqual([]);
    expect(expense.toAccountIds).toEqual([]);
    const income = ok(qs, "income").filters;
    expect(income.fromAccountIds).toEqual([]);
    const transfer = ok(qs, "transfer").filters;
    expect(transfer.accountIds).toEqual([]);
    expect(transfer.fromAccountIds).toEqual(["f"]);
    expect(transfer.toAccountIds).toEqual(["t"]);
  });
});

describe("buildExpenseWhere", () => {
  it("has only base conditions when nothing is set", () => {
    expect(buildExpenseWhere("u1", ok(""))).toEqual({ userId: "u1", isInstallment: false });
  });

  it("adds each filter alone as an AND entry", () => {
    expect(buildExpenseWhere("u1", ok("accountId=a1")).AND).toEqual([{ accountId: "a1" }]);
    expect(buildExpenseWhere("u1", ok("accountIds=a,b")).AND).toEqual([
      { accountId: { in: ["a", "b"] } },
    ]);
    expect(buildExpenseWhere("u1", ok("categoryIds=c1")).AND).toEqual([
      { expenseTypeId: { in: ["c1"] } },
    ]);
    expect(buildExpenseWhere("u1", ok("tagIds=t1,t2")).AND).toEqual([
      { tags: { some: { id: { in: ["t1", "t2"] } } } },
    ]);
  });

  it("builds Decimal amount bounds", () => {
    const and = buildExpenseWhere("u1", ok("amountMin=100&amountMax=250.5")).AND as Array<{
      amount: { gte: Prisma.Decimal; lte: Prisma.Decimal };
    }>;
    expect(and).toHaveLength(1);
    expect(and[0].amount.gte).toBeInstanceOf(Prisma.Decimal);
    expect(and[0].amount.gte.toString()).toBe("100");
    expect(and[0].amount.lte.toString()).toBe("250.5");
  });

  it("supports one-sided amount", () => {
    const min = buildExpenseWhere("u1", ok("amountMin=5")).AND as Array<{ amount: object }>;
    expect(Object.keys(min[0].amount)).toEqual(["gte"]);
    const max = buildExpenseWhere("u1", ok("amountMax=5")).AND as Array<{ amount: object }>;
    expect(Object.keys(max[0].amount)).toEqual(["lte"]);
  });

  it("builds an inclusive UTC date range", () => {
    const and = buildExpenseWhere("u1", ok("startDate=2026-03-01&endDate=2026-03-31")).AND as Array<{
      date: { gte: Date; lte: Date };
    }>;
    expect(and[0].date.gte.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(and[0].date.lte.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("supports a one-sided date range", () => {
    const and = buildExpenseWhere("u1", ok("startDate=2026-03-01")).AND as Array<{
      date: object;
    }>;
    expect(Object.keys(and[0].date)).toEqual(["gte"]);
  });

  it("puts search in its own AND entry with the existing OR fields", () => {
    const and = buildExpenseWhere("u1", ok("search=food")).AND as Array<{ OR: unknown[] }>;
    expect(and).toHaveLength(1);
    expect(and[0].OR).toHaveLength(6);
  });

  it("combines everything as separate AND entries and keeps base", () => {
    const where = buildExpenseWhere(
      "u1",
      ok("search=x&accountId=a1&accountIds=a2&categoryIds=c&tagIds=t&amountMin=1&startDate=2026-01-01")
    );
    expect(where.userId).toBe("u1");
    expect(where.isInstallment).toBe(false);
    expect(where.OR).toBeUndefined();
    expect(where.AND).toHaveLength(7);
  });
});

describe("buildIncomeWhere", () => {
  it("has only userId when nothing is set", () => {
    expect(buildIncomeWhere("u1", ok("", "income"))).toEqual({ userId: "u1" });
  });

  it("maps category to incomeTypeId and search to 5 fields", () => {
    expect(buildIncomeWhere("u1", ok("categoryIds=c1", "income")).AND).toEqual([
      { incomeTypeId: { in: ["c1"] } },
    ]);
    const and = buildIncomeWhere("u1", ok("search=pay", "income")).AND as Array<{ OR: unknown[] }>;
    expect(and[0].OR).toHaveLength(5);
  });

  it("handles account, tags, amount and date", () => {
    const where = buildIncomeWhere(
      "u1",
      ok("accountIds=a&tagIds=t&amountMax=9&endDate=2026-01-31", "income")
    );
    expect(where.AND).toHaveLength(4);
  });
});

describe("buildTransferWhere", () => {
  it("has only userId when nothing is set", () => {
    expect(buildTransferWhere("u1", ok("", "transfer"))).toEqual({ userId: "u1" });
  });

  it("maps from/to and category", () => {
    expect(
      buildTransferWhere("u1", ok("fromAccountIds=f1,f2&toAccountIds=t1&categoryIds=ty", "transfer")).AND
    ).toEqual([
      { fromAccountId: { in: ["f1", "f2"] } },
      { toAccountId: { in: ["t1"] } },
      { transferTypeId: { in: ["ty"] } },
    ]);
  });

  it("uses Number for the Float amount column", () => {
    const and = buildTransferWhere("u1", ok("amountMin=10&amountMax=20.5", "transfer")).AND as Array<{
      amount: { gte: number; lte: number };
    }>;
    expect(and[0].amount).toEqual({ gte: 10, lte: 20.5 });
  });

  it("keeps search and account scope as two separate AND entries", () => {
    const where = buildTransferWhere("u1", ok("search=rent&accountId=a1", "transfer"));
    expect(where.OR).toBeUndefined();
    expect(where.AND).toHaveLength(2);
    const and = where.AND as Array<{ OR: unknown[] }>;
    expect(and[0].OR).toHaveLength(6);
    expect(and[1].OR).toEqual([{ fromAccountId: "a1" }, { toAccountId: "a1" }]);
  });

  it("ignores accountIds for transfers", () => {
    expect(buildTransferWhere("u1", ok("accountIds=a", "transfer"))).toEqual({ userId: "u1" });
  });
});
