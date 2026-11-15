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

  it("zero-fills a Dec -> Jan gap with data on both sides of the year boundary", () => {
    const result = buildMonthlySeries([
      { date: d("2025-11-30T00:00:00.000Z"), amountCents: 1234, count: 1 },
      { date: d("2026-02-01T00:05:00.000Z"), amountCents: 4321, count: 2 },
    ]);
    expect(result).toEqual([
      { month: "2025-11", amount: 12.34, count: 1 },
      { month: "2025-12", amount: 0, count: 0 },
      { month: "2026-01", amount: 0, count: 0 },
      { month: "2026-02", amount: 43.21, count: 2 },
    ]);
  });

  it("puts last-day and first-day rows of adjacent months in their own UTC month", () => {
    const result = buildMonthlySeries([
      { date: d("2025-12-31T00:00:00.000Z"), amountCents: 100, count: 1 },
      { date: d("2025-12-31T00:07:00.000Z"), amountCents: 200, count: 1 },
      { date: d("2026-01-01T00:00:00.000Z"), amountCents: 300, count: 1 },
    ]);
    expect(result).toEqual([
      { month: "2025-12", amount: 3, count: 2 },
      { month: "2026-01", amount: 3, count: 1 },
    ]);
  });

  it("uses whole months for mid-month startDate/endDate bounds", () => {
    const result = buildMonthlySeries(
      [{ date: d("2026-05-20T00:00:00.000Z"), amountCents: 500, count: 1 }],
      "2026-03-31",
      "2026-06-01"
    );
    expect(result.map((r) => r.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  it("walks month arithmetic correctly across several years, including a leap February", () => {
    const result = buildMonthlySeries([], "2023-12-01", "2025-01-31");
    expect(result).toHaveLength(14);
    expect(result[0].month).toBe("2023-12");
    expect(result[1].month).toBe("2024-01");
    expect(result[2].month).toBe("2024-02");
    expect(result[12].month).toBe("2024-12");
    expect(result[13].month).toBe("2025-01");
  });

  it("returns 13 months for a Last 12 months range (both ends partial)", () => {
    const result = buildMonthlySeries([], "2025-11-15", "2026-11-15");
    expect(result).toHaveLength(13);
    expect(result[0].month).toBe("2025-11");
    expect(result[12].month).toBe("2026-11");
  });

  it("returns a single month for a This month range", () => {
    expect(buildMonthlySeries([], "2026-11-01", "2026-11-15")).toEqual([
      { month: "2026-11", amount: 0, count: 0 },
    ]);
  });

  it("does not depend on input order", () => {
    const groups = [
      { date: d("2026-03-01T00:00:00.000Z"), amountCents: 300, count: 1 },
      { date: d("2026-01-01T00:00:00.000Z"), amountCents: 100, count: 1 },
      { date: d("2026-03-09T00:05:00.000Z"), amountCents: 50, count: 1 },
    ];
    const result = buildMonthlySeries(groups);
    expect(result).toEqual([
      { month: "2026-01", amount: 1, count: 1 },
      { month: "2026-02", amount: 0, count: 0 },
      { month: "2026-03", amount: 3.5, count: 2 },
    ]);
  });

  it("keeps the centavo sum exact across many drifting values", () => {
    // 365 days of 0.10 + 0.20 + 0.07 per day: float summation would drift.
    const groups = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i));
      groups.push({ date, amountCents: 10, count: 1 });
      groups.push({ date: new Date(date.getTime() + 5 * 60_000), amountCents: 27, count: 2 });
    }
    const result = buildMonthlySeries(groups, "2026-01-01", "2026-12-31");
    expect(result).toHaveLength(12);
    const outCents = result.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    expect(outCents).toBe(365 * 37);
    expect(result.reduce((s, r) => s + r.count, 0)).toBe(365 * 3);
    // Every month's amount is an exact 2 dp value, not a float artifact
    for (const r of result) {
      expect(Math.round(r.amount * 100) / 100).toBe(r.amount);
    }
  });
});
