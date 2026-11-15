import { describe, it, expect } from "vitest";
import { buildMonthlySeries } from "./report-monthly-series";

const d = (iso: string) => new Date(iso);

describe("buildMonthlySeries", () => {
  it("zero-fills an empty middle month", () => {
    const result = buildMonthlySeries([
      { date: d("2026-01-10T00:00:00.000Z"), amountCents: 1000, count: 1 },
      { date: d("2026-03-05T00:00:00.000Z"), amountCents: 2500, count: 2 },
    ]);
    expect(result).toEqual([
      { month: "2026-01", amount: 10, count: 1 },
      { month: "2026-02", amount: 0, count: 0 },
      { month: "2026-03", amount: 25, count: 2 },
    ]);
  });

  it("handles a cross-year range Nov 2025 to Feb 2026", () => {
    const result = buildMonthlySeries([], "2025-11-20", "2026-02-03");
    expect(result.map((r) => r.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(result.every((r) => r.amount === 0 && r.count === 0)).toBe(true);
  });

  it("sums a UTC-midnight row and a cron 00:05Z row in the same month", () => {
    const result = buildMonthlySeries([
      { date: d("2026-03-15T00:00:00.000Z"), amountCents: 1000, count: 1 },
      { date: d("2026-03-15T00:05:00.000Z"), amountCents: 500, count: 1 },
    ]);
    expect(result).toEqual([{ month: "2026-03", amount: 15, count: 2 }]);
  });

  it("uses the latest bucket as end when only startDate is given", () => {
    const result = buildMonthlySeries(
      [{ date: d("2026-04-01T00:00:00.000Z"), amountCents: 100, count: 1 }],
      "2026-02-01"
    );
    expect(result.map((r) => r.month)).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  it("uses the earliest bucket as start when only endDate is given", () => {
    const result = buildMonthlySeries(
      [{ date: d("2026-02-10T00:00:00.000Z"), amountCents: 100, count: 1 }],
      undefined,
      "2026-04-30"
    );
    expect(result.map((r) => r.month)).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  it("returns [] with no bounds and no groups", () => {
    expect(buildMonthlySeries([])).toEqual([]);
    expect(buildMonthlySeries([], "2026-01-01")).toEqual([]);
    expect(buildMonthlySeries([], undefined, "2026-01-31")).toEqual([]);
  });

  it("zero-fills with both bounds and no groups", () => {
    expect(buildMonthlySeries([], "2026-01-15", "2026-03-15")).toHaveLength(3);
  });

  it("keeps the centavo sum exact for values that drift as floats", () => {
    const groups = [
      { date: d("2026-01-01T00:00:00.000Z"), amountCents: 10, count: 1 },
      { date: d("2026-01-02T00:00:00.000Z"), amountCents: 20, count: 1 },
      { date: d("2026-02-01T00:00:00.000Z"), amountCents: 10, count: 1 },
      { date: d("2026-03-01T00:00:00.000Z"), amountCents: 20, count: 1 },
    ];
    const result = buildMonthlySeries(groups);
    const outCents = result.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    expect(outCents).toBe(60);
    expect(result[0].amount).toBe(0.3);
  });
});
