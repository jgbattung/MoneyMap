"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";

import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  validateFilters,
  type TransactionFilters,
  type TransactionKind,
} from "@/lib/transaction-filters";
import { cn, formatDateForAPI } from "@/lib/utils";

type Option = { id: string; name: string };

export interface TransactionFilterOptions {
  accounts: Option[];
  categories: Option[];
  tags: Option[];
}

interface TransactionFilterFieldsProps {
  kind: TransactionKind;
  draft: TransactionFilters;
  onChange: (draft: TransactionFilters) => void;
  options: TransactionFilterOptions;
  hideAccount?: boolean;
  layout: "desktop" | "mobile";
}

type IdKey = "accountIds" | "fromAccountIds" | "toAccountIds" | "categoryIds" | "tagIds";

function parseDay(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function DateField({
  id,
  label,
  value,
  onSelect,
}: {
  id: string;
  label: string;
  value: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDay(value);
  const thisYear = new Date().getFullYear();

  return (
    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal hover:text-white"
          >
            {selected ? (
              format(selected, "MMMM, d, yyyy")
            ) : (
              <span className="text-muted-foreground">Select date</span>
            )}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(2015, 0)}
            endMonth={new Date(thisYear + 5, 11)}
            onDayClick={(date) => {
              onSelect(formatDateForAPI(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TransactionFilterFields({
  kind,
  draft,
  onChange,
  options,
  hideAccount = false,
  layout,
}: TransactionFilterFieldsProps) {
  const errors = validateFilters(draft);

  const toggle = (key: IdKey, id: string) => {
    const current = draft[key];
    onChange({
      ...draft,
      [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  return (
    <div className={cn("flex flex-col", layout === "desktop" ? "gap-4" : "gap-5")}>
      {kind === "transfer" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>From account</Label>
            <MultiSelectPopover
              options={options.accounts}
              selectedIds={draft.fromAccountIds}
              onToggle={(id) => toggle("fromAccountIds", id)}
              placeholder="Any account"
              itemLabel="account"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>To account</Label>
            <MultiSelectPopover
              options={options.accounts}
              selectedIds={draft.toAccountIds}
              onToggle={(id) => toggle("toAccountIds", id)}
              placeholder="Any account"
              itemLabel="account"
            />
          </div>
        </>
      ) : (
        !hideAccount && (
          <div className="flex flex-col gap-1.5">
            <Label>Account</Label>
            <MultiSelectPopover
              options={options.accounts}
              selectedIds={draft.accountIds}
              onToggle={(id) => toggle("accountIds", id)}
              placeholder="Any account"
              itemLabel="account"
            />
          </div>
        )
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        {layout === "desktop" ? (
          <MultiSelectPopover
            options={options.categories}
            selectedIds={draft.categoryIds}
            onToggle={(id) => toggle("categoryIds", id)}
            placeholder="Any category"
            itemLabel="category"
            itemLabelPlural="categories"
          />
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
            {options.categories.map((category) => {
              const pressed = draft.categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggle("categoryIds", category.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors",
                    pressed
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tags</Label>
        <MultiSelectPopover
          options={options.tags}
          selectedIds={draft.tagIds}
          onToggle={(id) => toggle("tagIds", id)}
          placeholder="Any tag"
          itemLabel="tag"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Amount</Label>
        <div className="flex items-center gap-2">
          <CurrencyInput
            aria-label="Minimum amount"
            placeholder="Min"
            value={draft.amountMin}
            onValueChange={(v) => onChange({ ...draft, amountMin: v })}
          />
          <span className="text-muted-foreground">–</span>
          <CurrencyInput
            aria-label="Maximum amount"
            placeholder="Max"
            value={draft.amountMax}
            onValueChange={(v) => onChange({ ...draft, amountMax: v })}
          />
        </div>
        {errors.amount && (
          <p role="alert" className="text-xs text-text-error">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <DateField
            id={`filter-start-date-${layout}`}
            label="From date"
            value={draft.startDate}
            onSelect={(startDate) => onChange({ ...draft, startDate })}
          />
          <DateField
            id={`filter-end-date-${layout}`}
            label="To date"
            value={draft.endDate}
            onSelect={(endDate) => onChange({ ...draft, endDate })}
          />
        </div>
        {errors.date && (
          <p role="alert" className="text-xs text-text-error">
            {errors.date}
          </p>
        )}
      </div>
    </div>
  );
}
