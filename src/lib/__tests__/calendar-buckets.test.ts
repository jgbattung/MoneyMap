import { describe, it, expect } from "vitest";
import { toDayKey, mergeDayBuckets, CalendarGroupByRow } from "../calendar-buckets";
import { CalendarDayBucket } from "@/types/calendar";

describe("toDayKey", () => {
  it("returns the UTC calendar-day key for a UTC-midnight date", () => {
    expect(toDayKey(new Date("2026-07-29T00:00:00.000Z"))).toBe("2026-07-29");
  });

  it("returns the same day key for a same-day timestamp with a non-zero time", () => {
    expect(toDayKey(new Date("2026-07-29T00:03:11.442Z"))).toBe("2026-07-29");
  });
});

describe("mergeDayBuckets", () => {
  it("merges a UTC-midnight row and a same-day wall-clock-timestamp row into a single bucket", () => {
    // Reproduces the real-world case: a form write lands on UTC midnight,
    // the installment cron writes a live timestamp on the same UTC day.
    const rows: CalendarGroupByRow[] = [
      { date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: "100.00" }, _count: 1 },
      { date: new Date("2026-07-29T00:03:11.442Z"), _sum: { amount: "50.00" }, _count: 1 },
    ];

    const map = mergeDayBuckets(rows, "expense", new Map<string, CalendarDayBucket>());

    expect(map.size).toBe(1);
    const bucket = map.get("2026-07-29");
    expect(bucket).toBeDefined();
    expect(bucket!.expense).toBe(150);
    expect(bucket!.expenseCount).toBe(2);
  });

  it("does not clobber existing amounts from a different channel already in the map", () => {
    const map = new Map<string, CalendarDayBucket>();
    mergeDayBuckets(
      [{ date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: "200.00" }, _count: 1 }],
      "income",
      map
    );
    mergeDayBuckets(
      [{ date: new Date("2026-07-29T08:00:00.000Z"), _sum: { amount: "75.50" }, _count: 2 }],
      "expense",
      map
    );

    expect(map.size).toBe(1);
    const bucket = map.get("2026-07-29")!;
    expect(bucket.income).toBe(200);
    expect(bucket.incomeCount).toBe(1);
    expect(bucket.expense).toBe(75.5);
    expect(bucket.expenseCount).toBe(2);
  });

  it("parses a Float _sum (transfer, schema debt) and a Decimal-as-string _sum (expense/income) identically", () => {
    const floatMap = mergeDayBuckets(
      [{ date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: 42.5 }, _count: 1 }],
      "transfer",
      new Map<string, CalendarDayBucket>()
    );
    const stringMap = mergeDayBuckets(
      [{ date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: "42.50" }, _count: 1 }],
      "transfer",
      new Map<string, CalendarDayBucket>()
    );

    expect(floatMap.get("2026-07-29")!.transfer).toBe(42.5);
    expect(stringMap.get("2026-07-29")!.transfer).toBe(42.5);
  });

  it("treats a null _sum.amount as zero", () => {
    const map = mergeDayBuckets(
      [{ date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: null }, _count: 0 }],
      "income",
      new Map<string, CalendarDayBucket>()
    );

    expect(map.get("2026-07-29")!.income).toBe(0);
  });

  it("returns the same (possibly empty) map unchanged for an empty row set", () => {
    const map = new Map<string, CalendarDayBucket>();
    const result = mergeDayBuckets([], "expense", map);

    expect(result).toBe(map);
    expect(result.size).toBe(0);
  });

  it("keeps distinct UTC days in separate buckets", () => {
    const map = mergeDayBuckets(
      [
        { date: new Date("2026-07-28T23:59:59.999Z"), _sum: { amount: "10" }, _count: 1 },
        { date: new Date("2026-07-29T00:00:00.000Z"), _sum: { amount: "20" }, _count: 1 },
      ],
      "expense",
      new Map<string, CalendarDayBucket>()
    );

    expect(map.size).toBe(2);
    expect(map.get("2026-07-28")!.expense).toBe(10);
    expect(map.get("2026-07-29")!.expense).toBe(20);
  });
});
