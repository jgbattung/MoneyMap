import { formatDateForAPI } from "@/lib/utils";

export type TransactionKind = "expense" | "income" | "transfer";
export type DatePreset = "view-all" | "this-week" | "this-month" | "this-year";

export interface TransactionFilters {
  accountIds: string[];
  fromAccountIds: string[];
  toAccountIds: string[];
  categoryIds: string[];
  tagIds: string[];
  amountMin: string;
  amountMax: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  accountIds: [],
  fromAccountIds: [],
  toAccountIds: [],
  categoryIds: [],
  tagIds: [],
  amountMin: "",
  amountMax: "",
  startDate: "",
  endDate: "",
};

export function resolveDatePreset(
  preset: DatePreset | null,
  now: Date = new Date()
): { startDate: string; endDate: string } | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this-week": {
      const start = new Date(y, m, now.getDate() - now.getDay());
      const end = new Date(y, m, now.getDate() - now.getDay() + 6);
      return { startDate: formatDateForAPI(start), endDate: formatDateForAPI(end) };
    }
    case "this-month":
      return {
        startDate: formatDateForAPI(new Date(y, m, 1)),
        endDate: formatDateForAPI(new Date(y, m + 1, 0)),
      };
    case "this-year":
      return {
        startDate: formatDateForAPI(new Date(y, 0, 1)),
        endDate: formatDateForAPI(new Date(y, 11, 31)),
      };
    default:
      return null;
  }
}

export function countActiveFilters(filters: TransactionFilters): number {
  let count = 0;
  if (filters.accountIds.length > 0) count++;
  if (filters.fromAccountIds.length > 0) count++;
  if (filters.toAccountIds.length > 0) count++;
  if (filters.categoryIds.length > 0) count++;
  if (filters.tagIds.length > 0) count++;
  if (filters.amountMin || filters.amountMax) count++;
  if (filters.startDate || filters.endDate) count++;
  return count;
}

export function filtersToSearchParams(
  filters: TransactionFilters,
  params: URLSearchParams
): URLSearchParams {
  const idKeys = [
    "accountIds",
    "fromAccountIds",
    "toAccountIds",
    "categoryIds",
    "tagIds",
  ] as const;
  for (const key of idKeys) {
    if (filters[key].length > 0) params.append(key, filters[key].join(","));
  }
  const scalarKeys = ["amountMin", "amountMax", "startDate", "endDate"] as const;
  for (const key of scalarKeys) {
    if (filters[key]) params.append(key, filters[key]);
  }
  return params;
}

export function validateFilters(filters: TransactionFilters): {
  amount?: string;
  date?: string;
} {
  const errors: { amount?: string; date?: string } = {};
  if (
    filters.amountMin &&
    filters.amountMax &&
    parseFloat(filters.amountMin) > parseFloat(filters.amountMax)
  ) {
    errors.amount = "Min must be less than or equal to max";
  }
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate > filters.endDate
  ) {
    errors.date = "Start date must be on or before end date";
  }
  return errors;
}

/**
 * Whether a freshly created row may be optimistically prepended to a cached
 * list query. Only unfiltered, unsearched first pages whose date range (if
 * any) contains the row qualify; everything else relies on the refetch.
 */
export function shouldInsertOptimisticRow(
  params:
    | {
        skip?: number;
        search?: string;
        startDate?: string;
        endDate?: string;
        filters?: TransactionFilters;
      }
    | undefined,
  rowDate?: string
): boolean {
  if (!params) return true;
  const isFirstPage = !params.skip || params.skip === 0;
  if (!isFirstPage || params.search) return false;
  if (countActiveFilters(params.filters ?? EMPTY_FILTERS) > 0) return false;
  if (!params.startDate && !params.endDate) return true;

  const day = rowDate
    ? /^\d{4}-\d{2}-\d{2}/.test(rowDate)
      ? rowDate.slice(0, 10)
      : formatDateForAPI(new Date(rowDate))
    : formatDateForAPI(new Date());
  if (params.startDate && day < params.startDate) return false;
  if (params.endDate && day > params.endDate) return false;
  return true;
}

/**
 * The list API only accepts ^\d+(\.\d{1,2})?$ for amounts, so drop a dangling
 * "." and any extra decimals from what the user typed.
 */
export function normalizeAmountInput(raw: string): string {
  if (raw === "" || raw === ".") return "";
  const [whole, decimals] = raw.split(".");
  if (decimals === undefined) return whole;
  if (decimals === "") return whole;
  return `${whole || "0"}.${decimals.slice(0, 2)}`;
}

export function normalizeFilters(filters: TransactionFilters): TransactionFilters {
  return {
    ...filters,
    amountMin: normalizeAmountInput(filters.amountMin),
    amountMax: normalizeAmountInput(filters.amountMax),
  };
}
