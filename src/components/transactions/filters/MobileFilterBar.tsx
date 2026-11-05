"use client";

import { SearchIcon } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { useTransactionFilters } from "@/hooks/useTransactionFilters";
import type { DatePreset, TransactionKind } from "@/lib/transaction-filters";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { FilterSummary } from "./FilterSummary";
import { TransactionFilterControl } from "./TransactionFilterControl";
import type { TransactionFilterOptions } from "./TransactionFilterFields";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "view-all", label: "View All" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "this-year", label: "This Year" },
];

interface MobileFilterBarProps {
  kind: TransactionKind;
  filterState: ReturnType<typeof useTransactionFilters>;
  options: TransactionFilterOptions;
  hideAccount?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  isLoading: boolean;
  isSearching: boolean;
  total: number;
  totalAmount?: string;
}

/** Search, filter sheet trigger, date presets, active chips and the total line for mobile lists. */
export function MobileFilterBar({
  kind,
  filterState,
  options,
  hideAccount,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  isLoading,
  isSearching,
  total,
  totalAmount,
}: MobileFilterBarProps) {
  const { preset, setPreset, filters, applyFilters, removeFilter, clearAll, activeCount, isActive } =
    filterState;

  return (
    <>
      <div className="flex items-center gap-2">
        <InputGroup>
          <InputGroupInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-sm h-8 py-1"
            disabled={isLoading}
          />
          <InputGroupAddon>
            <SearchIcon className="h-4 w-4" />
          </InputGroupAddon>
        </InputGroup>
        <TransactionFilterControl
          kind={kind}
          variant="mobile"
          filters={filters}
          activeCount={activeCount}
          onApply={applyFilters}
          options={options}
          hideAccount={hideAccount}
        />
      </div>

      <ToggleGroup
        type="single"
        value={preset ?? ""}
        variant="outline"
        size="sm"
        onValueChange={(value) => !isLoading && value && setPreset(value as DatePreset)}
        className="w-full justify-start"
        disabled={isLoading}
      >
        {PRESETS.map(({ value, label }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            disabled={isLoading}
            className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold flex-1 px-3 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ActiveFilterChips
        kind={kind}
        filters={filters}
        options={options}
        onRemove={removeFilter}
        onClearAll={clearAll}
      />
      {(isActive || isSearching) && !isLoading && (
        <FilterSummary kind={kind} total={total} totalAmount={totalAmount} />
      )}
    </>
  );
}
