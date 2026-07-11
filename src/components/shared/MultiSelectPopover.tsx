"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface MultiSelectPopoverProps {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  itemLabel: string;
  /** Plural form of itemLabel, for irregular plurals (e.g. "category" -> "categories"). Defaults to `${itemLabel}s`. */
  itemLabelPlural?: string;
  searchPlaceholder?: string;
}

export function MultiSelectPopover({
  options,
  selectedIds,
  onToggle,
  placeholder,
  itemLabel,
  itemLabelPlural,
  searchPlaceholder,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const plural = itemLabelPlural ?? `${itemLabel}s`;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {selectedIds.length > 0 ? (
            `${selectedIds.length} ${selectedIds.length > 1 ? plural : itemLabel} selected`
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? `Search ${plural}...`} />
          <CommandList>
            <CommandEmpty>No {plural} found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => onToggle(option.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(option.id)}
                    className="mr-2"
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
