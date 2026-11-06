import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionFilters } from "./useTransactionFilters";
import { EMPTY_FILTERS } from "@/lib/transaction-filters";

describe("useTransactionFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 12, 0, 0)); // Thu Nov 5 2026
  });
  afterEach(() => vi.useRealTimers());

  it("starts as view-all with no filters", () => {
    const { result } = renderHook(() => useTransactionFilters());
    expect(result.current.preset).toBe("view-all");
    expect(result.current.filters).toEqual(EMPTY_FILTERS);
    expect(result.current.queryDates).toEqual({});
    expect(result.current.activeCount).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it("resolves preset dates and marks active", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.setPreset("this-month"));
    expect(result.current.queryDates).toEqual({ startDate: "2026-11-01", endDate: "2026-11-30" });
    expect(result.current.isActive).toBe(true);
    expect(result.current.activeCount).toBe(0);
    act(() => result.current.setPreset("this-week"));
    expect(result.current.queryDates).toEqual({ startDate: "2026-11-01", endDate: "2026-11-07" });
  });

  it("applying a custom range deselects the preset and uses the range", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.setPreset("this-year"));
    act(() =>
      result.current.applyFilters({ ...EMPTY_FILTERS, startDate: "2026-01-05", endDate: "2026-02-10" })
    );
    expect(result.current.preset).toBeNull();
    expect(result.current.queryDates).toEqual({ startDate: "2026-01-05", endDate: "2026-02-10" });
    expect(result.current.activeCount).toBe(1);
  });

  it("selecting a preset clears the custom range but keeps other filters", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() =>
      result.current.applyFilters({
        ...EMPTY_FILTERS,
        tagIds: ["t"],
        startDate: "2026-01-05",
        endDate: "2026-02-10",
      })
    );
    act(() => result.current.setPreset("this-month"));
    expect(result.current.filters.startDate).toBe("");
    expect(result.current.filters.endDate).toBe("");
    expect(result.current.filters.tagIds).toEqual(["t"]);
    expect(result.current.preset).toBe("this-month");
  });

  it("applying without a custom range keeps the current preset", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.setPreset("this-month"));
    act(() => result.current.applyFilters({ ...EMPTY_FILTERS, accountIds: ["a"] }));
    expect(result.current.preset).toBe("this-month");
  });

  it("clearing the custom range via apply restores view-all", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.applyFilters({ ...EMPTY_FILTERS, startDate: "2026-01-01" }));
    expect(result.current.preset).toBeNull();
    act(() => result.current.applyFilters(EMPTY_FILTERS));
    expect(result.current.preset).toBe("view-all");
  });

  it("removeFilter clears each group", () => {
    const { result } = renderHook(() => useTransactionFilters());
    const full = {
      accountIds: ["a"],
      fromAccountIds: ["f"],
      toAccountIds: ["t"],
      categoryIds: ["c"],
      tagIds: ["g"],
      amountMin: "1",
      amountMax: "9",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    };
    act(() => result.current.applyFilters(full));
    expect(result.current.activeCount).toBe(7);

    act(() => result.current.removeFilter("account"));
    expect(result.current.filters.accountIds).toEqual([]);
    act(() => result.current.removeFilter("from"));
    expect(result.current.filters.fromAccountIds).toEqual([]);
    act(() => result.current.removeFilter("to"));
    expect(result.current.filters.toAccountIds).toEqual([]);
    act(() => result.current.removeFilter("category"));
    expect(result.current.filters.categoryIds).toEqual([]);
    act(() => result.current.removeFilter("tags"));
    expect(result.current.filters.tagIds).toEqual([]);
    act(() => result.current.removeFilter("amount"));
    expect(result.current.filters.amountMin).toBe("");
    expect(result.current.filters.amountMax).toBe("");
    expect(result.current.activeCount).toBe(1);
    expect(result.current.preset).toBeNull();

    act(() => result.current.removeFilter("date"));
    expect(result.current.filters).toEqual(EMPTY_FILTERS);
    expect(result.current.preset).toBe("view-all");
    expect(result.current.isActive).toBe(false);
  });

  it("clearAll resets filters and preset", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.setPreset("this-year"));
    act(() => result.current.applyFilters({ ...EMPTY_FILTERS, tagIds: ["g"], startDate: "2026-01-01" }));
    act(() => result.current.clearAll());
    expect(result.current.filters).toEqual(EMPTY_FILTERS);
    expect(result.current.preset).toBe("view-all");
    expect(result.current.queryDates).toEqual({});
  });

  it("one-sided custom range yields only that bound", () => {
    const { result } = renderHook(() => useTransactionFilters());
    act(() => result.current.applyFilters({ ...EMPTY_FILTERS, endDate: "2026-03-01" }));
    expect(result.current.queryDates).toEqual({ startDate: undefined, endDate: "2026-03-01" });
  });
});
