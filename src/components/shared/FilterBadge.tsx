import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface FilterBadgeProps {
  children: React.ReactNode;
  onRemove?: () => void;
  /** Accessible name for the remove button. */
  removeLabel?: string;
}

export function FilterBadge({ children, onRemove, removeLabel }: FilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="text-xs gap-1 hover:bg-secondary/80 transition-colors duration-150"
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors duration-150 active:scale-95 cursor-pointer"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
