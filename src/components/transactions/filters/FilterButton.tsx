"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FilterButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "variant" | "size" | "children"> {
  variant: "desktop" | "mobile";
  count: number;
}

export const FilterButton = React.forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ variant, count, ...props }, ref) => {
    const isMobile = variant === "mobile";
    return (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        size={isMobile ? "icon" : "default"}
        aria-label={isMobile ? "Filters" : undefined}
        className={isMobile ? "relative shrink-0" : "gap-2"}
        {...props}
      >
        <ListFilter className="h-4 w-4" />
        {!isMobile && <span>Filters</span>}
        {count > 0 && (
          <span
            data-testid="filter-count"
            className={
              isMobile
                ? "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
                : "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
            }
          >
            {count}
          </span>
        )}
      </Button>
    );
  }
);
FilterButton.displayName = "FilterButton";
