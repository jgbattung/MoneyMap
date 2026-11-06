"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  EMPTY_FILTERS,
  normalizeFilters,
  validateFilters,
  type TransactionFilters,
  type TransactionKind,
} from "@/lib/transaction-filters";
import { FilterButton } from "./FilterButton";
import {
  TransactionFilterFields,
  type TransactionFilterOptions,
} from "./TransactionFilterFields";

interface TransactionFilterControlProps {
  kind: TransactionKind;
  variant: "desktop" | "mobile";
  filters: TransactionFilters;
  activeCount: number;
  onApply: (draft: TransactionFilters) => void;
  options: TransactionFilterOptions;
  hideAccount?: boolean;
}

export function TransactionFilterControl({
  kind,
  variant,
  filters,
  activeCount,
  onApply,
  options,
  hideAccount = false,
}: TransactionFilterControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TransactionFilters>(filters);

  const errors = validateFilters(draft);
  const hasErrors = Boolean(errors.amount || errors.date);

  const handleOpenChange = (next: boolean) => {
    // Every open starts from the applied filters; closing discards the draft.
    if (next) setDraft(filters);
    setOpen(next);
  };

  const handleApply = () => {
    if (hasErrors) return;
    onApply(normalizeFilters(draft));
    setOpen(false);
  };

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <Button type="button" variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)}>
        Reset
      </Button>
      <Button type="button" onClick={handleApply} disabled={hasErrors}>
        Apply
      </Button>
    </div>
  );

  if (variant === "mobile") {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <FilterButton variant="mobile" count={activeCount} />
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription className="sr-only">
              Filter transactions, then press Apply.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <TransactionFilterFields
              kind={kind}
              draft={draft}
              onChange={setDraft}
              options={options}
              hideAccount={hideAccount}
              layout="mobile"
            />
          </div>
          <div className="sticky bottom-0 border-t bg-background p-4">{footer}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <FilterButton variant="desktop" count={activeCount} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-4">
        <div className="flex flex-col gap-4">
          <TransactionFilterFields
            kind={kind}
            draft={draft}
            onChange={setDraft}
            options={options}
            hideAccount={hideAccount}
            layout="desktop"
          />
          <div className="border-t pt-3">{footer}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
