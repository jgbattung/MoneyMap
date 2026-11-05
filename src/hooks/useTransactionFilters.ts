import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  resolveDatePreset,
  type DatePreset,
  type TransactionFilters,
} from "@/lib/transaction-filters";

export type FilterGroup =
  | "account"
  | "from"
  | "to"
  | "category"
  | "tags"
  | "amount"
  | "date";

export const useTransactionFilters = () => {
  const [preset, setPresetState] = useState<DatePreset | null>("view-all");
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);

  const setPreset = useCallback((next: DatePreset) => {
    setPresetState(next);
    setFilters((prev) =>
      prev.startDate || prev.endDate ? { ...prev, startDate: "", endDate: "" } : prev
    );
  }, []);

  const applyFilters = useCallback((draft: TransactionFilters) => {
    setFilters(draft);
    if (draft.startDate || draft.endDate) {
      setPresetState(null);
    } else {
      // No custom range: keep the selected preset, or fall back to view-all
      // when the previous range was just cleared.
      setPresetState((prev) => prev ?? "view-all");
    }
  }, []);

  const removeFilter = useCallback((group: FilterGroup) => {
    setFilters((prev) => {
      switch (group) {
        case "account":
          return { ...prev, accountIds: [] };
        case "from":
          return { ...prev, fromAccountIds: [] };
        case "to":
          return { ...prev, toAccountIds: [] };
        case "category":
          return { ...prev, categoryIds: [] };
        case "tags":
          return { ...prev, tagIds: [] };
        case "amount":
          return { ...prev, amountMin: "", amountMax: "" };
        case "date":
          return { ...prev, startDate: "", endDate: "" };
      }
    });
    if (group === "date") {
      setPresetState((prev) => prev ?? "view-all");
    }
  }, []);

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPresetState("view-all");
  }, []);

  const queryDates = useMemo((): { startDate?: string; endDate?: string } => {
    if (filters.startDate || filters.endDate) {
      return {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
    }
    return resolveDatePreset(preset) ?? {};
  }, [filters.startDate, filters.endDate, preset]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const isActive = activeCount > 0 || preset !== "view-all";

  return {
    preset,
    setPreset,
    filters,
    applyFilters,
    removeFilter,
    clearAll,
    queryDates,
    activeCount,
    isActive,
  };
};
