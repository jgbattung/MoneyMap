import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filtersToSearchParams,
  resolveDatePreset,
  validateFilters,
} from "./transaction-filters";

describe("resolveDatePreset", () => {
  it("returns null for view-all and null", () => {
    expect(resolveDatePreset("view-all")).toBeNull();
    expect(resolveDatePreset(null)).toBeNull();
  });

  it("this-month covers the full month", () => {
    expect(resolveDatePreset("this-month", new Date(2026, 10, 5))).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });
    expect(resolveDatePreset("this-month", new Date(2026, 11, 31))).toEqual({
      startDate: "2026-12-01",
      endDate: "2026-12-31",
    });
  });

  it("this-month handles Jan 1", () => {
    expect(resolveDatePreset("this-month", new Date(2027, 0, 1))).toEqual({
      startDate: "2027-01-01",
      endDate: "2027-01-31",
    });
  });

  it("this-month handles February in leap and non-leap years", () => {
    expect(resolveDatePreset("this-month", new Date(2028, 1, 10))?.endDate).toBe("2028-02-29");
    expect(resolveDatePreset("this-month", new Date(2027, 1, 10))?.endDate).toBe("2027-02-28");
  });

  it("this-year spans Jan 1 to Dec 31", () => {
    expect(resolveDatePreset("this-year", new Date(2026, 5, 15))).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(resolveDatePreset("this-year", new Date(2026, 11, 31))).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
  });

  it("this-week is Sunday to Saturday", () => {
    // Sunday 2026-11-01
    expect(resolveDatePreset("this-week", new Date(2026, 10, 1))).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });
    // Wednesday 2026-11-04
    expect(resolveDatePreset("this-week", new Date(2026, 10, 4))).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });
    // Saturday 2026-11-07
    expect(resolveDatePreset("this-week", new Date(2026, 10, 7))).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-07",
    });
  });

  it("this-week crosses month and year boundaries", () => {
    // Thursday 2026-12-31 -> Sun 2026-12-27 .. Sat 2027-01-02
    expect(resolveDatePreset("this-week", new Date(2026, 11, 31))).toEqual({
      startDate: "2026-12-27",
      endDate: "2027-01-02",
    });
  });
});

describe("countActiveFilters", () => {
  it("is 0 for empty filters", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it("counts each group once", () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, accountIds: ["a", "b"] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, fromAccountIds: ["a"] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, toAccountIds: ["a"] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, categoryIds: ["c"] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, tagIds: ["t"] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: "1" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMax: "9" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: "1", amountMax: "9" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, startDate: "2026-01-01" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, endDate: "2026-01-02" })).toBe(1);
  });

  it("sums combinations", () => {
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        accountIds: ["a"],
        tagIds: ["t"],
        amountMin: "5",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
      })
    ).toBe(4);
  });
});

describe("filtersToSearchParams", () => {
  it("omits empty values", () => {
    expect(filtersToSearchParams(EMPTY_FILTERS, new URLSearchParams()).toString()).toBe("");
  });

  it("comma-joins arrays and appends scalars", () => {
    const params = filtersToSearchParams(
      {
        ...EMPTY_FILTERS,
        accountIds: ["a", "b"],
        fromAccountIds: ["f"],
        toAccountIds: ["t1", "t2"],
        categoryIds: ["c"],
        tagIds: ["x", "y"],
        amountMin: "10",
        amountMax: "20.50",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      },
      new URLSearchParams()
    );
    expect(params.get("accountIds")).toBe("a,b");
    expect(params.get("fromAccountIds")).toBe("f");
    expect(params.get("toAccountIds")).toBe("t1,t2");
    expect(params.get("categoryIds")).toBe("c");
    expect(params.get("tagIds")).toBe("x,y");
    expect(params.get("amountMin")).toBe("10");
    expect(params.get("amountMax")).toBe("20.50");
    expect(params.get("startDate")).toBe("2026-01-01");
    expect(params.get("endDate")).toBe("2026-01-31");
  });

  it("preserves existing params", () => {
    const base = new URLSearchParams({ search: "x" });
    const params = filtersToSearchParams({ ...EMPTY_FILTERS, tagIds: ["t"] }, base);
    expect(params.get("search")).toBe("x");
    expect(params.get("tagIds")).toBe("t");
  });
});

describe("validateFilters", () => {
  it("flags min > max", () => {
    expect(validateFilters({ ...EMPTY_FILTERS, amountMin: "10", amountMax: "5" }).amount).toBe(
      "Min must be less than or equal to max"
    );
  });

  it("allows equal and single-sided amounts", () => {
    expect(validateFilters({ ...EMPTY_FILTERS, amountMin: "5", amountMax: "5" })).toEqual({});
    expect(validateFilters({ ...EMPTY_FILTERS, amountMin: "5" })).toEqual({});
  });

  it("compares amounts numerically, not lexically", () => {
    expect(validateFilters({ ...EMPTY_FILTERS, amountMin: "9", amountMax: "10" })).toEqual({});
  });

  it("flags start > end", () => {
    expect(
      validateFilters({ ...EMPTY_FILTERS, startDate: "2026-02-01", endDate: "2026-01-01" }).date
    ).toBe("Start date must be on or before end date");
  });

  it("allows same-day range", () => {
    expect(
      validateFilters({ ...EMPTY_FILTERS, startDate: "2026-02-01", endDate: "2026-02-01" })
    ).toEqual({});
  });
});
