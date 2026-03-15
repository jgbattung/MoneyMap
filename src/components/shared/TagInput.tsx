"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
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
  const { tags, createTag, isCreating } = useTagsQuery();
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
    try {
      const newTag = await createTag(inputValue.trim());
      onChange([...selectedTagIds, newTag.id]);
      setInputValue("");
      setOpen(false);
      inputRef.current?.focus();
    } catch {
      // duplicate or error — silently ignore
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setOpen(e.target.value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTags.length > 0 && !exactMatch) {
        // if there's a non-exact match result, create new tag
        handleCreate();
      } else if (filteredTags.length === 1) {
        handleSelect(filteredTags[0].id);
      } else if (inputValue.trim() && !exactMatch) {
        handleCreate();
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tag pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input + Popover */}
      {!atLimit && !disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (inputValue.length > 0) setOpen(true);
              }}
              placeholder="Add tags..."
              className="h-8 text-sm"
              disabled={disabled}
            />
          </PopoverTrigger>
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
      )}

      {atLimit && (
        <p className="text-xs text-muted-foreground">(max {MAX_TAGS} tags)</p>
      )}
    </div>
  );
}
