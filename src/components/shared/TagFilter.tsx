"use client";

import { useState } from "react";
import { Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTagsQuery } from "@/hooks/useTagsQuery";

interface TagFilterProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagFilter({ selectedTagIds, onChange, disabled }: TagFilterProps) {
  const { tags, isLoading } = useTagsQuery();
  const [search, setSearch] = useState("");

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const clearAll = () => onChange([]);

  const noTags = !isLoading && tags.length === 0;
  const label =
    selectedTagIds.length > 0 ? `Tags (${selectedTagIds.length})` : "Tags";

  return (
    <div className="flex flex-col gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || noTags}
            title={noTags ? "No tags created yet" : undefined}
            className="h-8 gap-1.5"
          >
            <Tags className="h-3.5 w-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground mb-2"
          />
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5">
            {filteredTags.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-2 text-center">
                No tags found
              </p>
            )}
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted w-full text-left"
              >
                <Checkbox
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggle(tag.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-none"
                />
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
          </div>
          {selectedTagIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center"
            >
              Clear all
            </button>
          )}
        </PopoverContent>
      </Popover>

      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags
            .filter((t) => selectedTagIds.includes(t.id))
            .map((tag) => (
              <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 pr-1">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${tag.name} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
