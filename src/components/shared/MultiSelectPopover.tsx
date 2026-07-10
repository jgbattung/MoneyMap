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
  searchPlaceholder?: string;
}

export function MultiSelectPopover({
  options,
  selectedIds,
  onToggle,
  placeholder,
  itemLabel,
  searchPlaceholder,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {selectedIds.length > 0 ? (
            `${selectedIds.length} ${itemLabel}${selectedIds.length > 1 ? "s" : ""} selected`
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? `Search ${itemLabel}s...`} />
          <CommandList>
            <CommandEmpty>No {itemLabel}s found.</CommandEmpty>
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
