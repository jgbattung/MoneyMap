"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTagsQuery } from "@/hooks/useTagsQuery";

interface TagInputProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

const MAX_TAGS = 10;

export function TagInput({ selectedTagIds, onChange, disabled }: TagInputProps) {
  const { tags, createTagOptimistic, isCreating } = useTagsQuery();
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const atLimit = selectedTagIds.length >= MAX_TAGS;

  const filteredTags = tags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === inputValue.toLowerCase()
  );

  const handleSelect = (tagId: string) => {
    if (!selectedTagIds.includes(tagId) && selectedTagIds.length < MAX_TAGS) {
      onChange([...selectedTagIds, tagId]);
    }
    setInputValue("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreate = async () => {
    if (!inputValue.trim() || isCreating) return;
    const trimmed = inputValue.trim();
    const { optimisticId, settle } = createTagOptimistic(trimmed);
    // Add pill immediately with optimistic ID
    onChange([...selectedTagIds, optimisticId]);
    setInputValue("");
    setOpen(false);
    inputRef.current?.focus();
    try {
      const realTag = await settle;
      // Swap optimistic ID for real ID once API resolves
      onChange(
        [...selectedTagIds, optimisticId].map((id) =>
          id === optimisticId ? realTag.id : id
        )
      );
    } catch {
      // On failure, remove the optimistic pill
      onChange(selectedTagIds.filter((id) => id !== optimisticId));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.length > 0) {
      setOpen(true);
    }
  };

  const handleFocus = () => {
    const hasUnselectedTags = tags.some((t) => !selectedTagIds.includes(t.id));
    setOpen(hasUnselectedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      if (exactMatch) {
        // Exact match — select the existing tag
        const matchingTag =
          filteredTags.find(
            (t) => t.name.toLowerCase() === trimmed.toLowerCase()
          ) || tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
        if (matchingTag && !selectedTagIds.includes(matchingTag.id)) {
          handleSelect(matchingTag.id);
        }
      } else {
        // No exact match — create new tag
        handleCreate();
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {/* Inline pill container */}
        <div
          className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[36px] cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1 shrink-0"
            >
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(tag.id);
                  }}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {!atLimit && !disabled && (
            <input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
              className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            />
          )}
          {atLimit && (
            <span className="text-xs text-muted-foreground">(max {MAX_TAGS} tags)</span>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="start"
      >
        <Command>
          <CommandList>
            {filteredTags.length === 0 && !inputValue.trim() && (
              <CommandEmpty>Type to search or create a tag.</CommandEmpty>
            )}
            {filteredTags.length > 0 && (
              <CommandGroup heading="Existing tags">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleSelect(tag.id)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {inputValue.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  disabled={isCreating}
                  className="text-muted-foreground"
                >
                  {isCreating ? "Creating..." : `Create "${inputValue.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}
            {inputValue.trim() && filteredTags.length === 0 && !exactMatch && (
              <CommandEmpty className="hidden" />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
