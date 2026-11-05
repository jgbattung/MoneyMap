"use client";

import { format } from "date-fns";

import { FilterBadge } from "@/components/shared/FilterBadge";
import type { FilterGroup } from "@/hooks/useTransactionFilters";
import type { TransactionFilters, TransactionKind } from "@/lib/transaction-filters";

type Option = { id: string; name: string };

interface ActiveFilterChipsProps {
  kind: TransactionKind;
  filters: TransactionFilters;
  options: { accounts: Option[]; categories: Option[]; tags: Option[] };
  onRemove: (group: FilterGroup) => void;
  onClearAll: () => void;
}

function formatPeso(value: string): string {
  return `₱${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function describeIds(
  ids: string[],
  options: Option[],
  plural: string
): string {
  if (ids.length === 1) return options.find((o) => o.id === ids[0])?.name ?? `1 ${plural.replace(/s$/, "")}`;
  return `${ids.length} ${plural}`;
}

function amountLabel(min: string, max: string): string {
  if (min && max) return `${formatPeso(min)} – ${formatPeso(max)}`;
  if (min) return `≥ ${formatPeso(min)}`;
  return `≤ ${formatPeso(max)}`;
}

function dateLabel(start: string, end: string): string {
  if (start && end) {
    const s = parseDay(start);
    const e = parseDay(end);
    if (s.getFullYear() === e.getFullYear()) {
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
  }
  if (start) return `from ${format(parseDay(start), "MMM d, yyyy")}`;
  return `until ${format(parseDay(end), "MMM d, yyyy")}`;
}

export function ActiveFilterChips({
  kind,
  filters,
  options,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: { group: FilterGroup; label: string }[] = [];

  if (kind !== "transfer" && filters.accountIds.length > 0) {
    const text = describeIds(filters.accountIds, options.accounts, "accounts");
    chips.push({
      group: "account",
      label: filters.accountIds.length === 1 ? `Account: ${text}` : text,
    });
  }
  if (kind === "transfer" && filters.fromAccountIds.length > 0) {
    chips.push({
      group: "from",
      label: `From: ${describeIds(filters.fromAccountIds, options.accounts, "accounts")}`,
    });
  }
  if (kind === "transfer" && filters.toAccountIds.length > 0) {
    chips.push({
      group: "to",
      label: `To: ${describeIds(filters.toAccountIds, options.accounts, "accounts")}`,
    });
  }
  if (filters.categoryIds.length > 0) {
    const text = describeIds(filters.categoryIds, options.categories, "categories");
    chips.push({
      group: "category",
      label: filters.categoryIds.length === 1 ? `Category: ${text}` : text,
    });
  }
  if (filters.tagIds.length > 0) {
    const text = describeIds(filters.tagIds, options.tags, "tags");
    chips.push({
      group: "tags",
      label: filters.tagIds.length === 1 ? `Tags: ${text}` : text,
    });
  }
  if (filters.amountMin || filters.amountMax) {
    chips.push({
      group: "amount",
      label: `Amount: ${amountLabel(filters.amountMin, filters.amountMax)}`,
    });
  }
  if (filters.startDate || filters.endDate) {
    chips.push({
      group: "date",
      label: `Date: ${dateLabel(filters.startDate, filters.endDate)}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-chips">
      {chips.map(({ group, label }) => (
        <FilterBadge
          key={group}
          onRemove={() => onRemove(group)}
          removeLabel={`Remove filter ${label}`}
        >
          {label}
        </FilterBadge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}
