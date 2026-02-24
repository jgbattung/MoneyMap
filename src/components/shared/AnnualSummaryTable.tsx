"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnualSummary, type AnnualSummaryMonth } from "@/hooks/useAnnualSummary";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getSavingsColorClass = (savings: number): string => {
  if (savings > 0) return "text-success-600";
  if (savings < 0) return "text-error-600";
  return "";
};

export default function AnnualSummaryTable() {
  const { years, isLoading, error } = useAnnualSummary();
  const currentYear = new Date().getFullYear();

  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([currentYear])
  );

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  if (error) {
    return (
      <div className="bg-card border border-border rounded-md p-4 shadow-md max-w-5xl">
        <h2 className="text-foreground font-semibold text-sm md:text-base mb-4">
          Annual Summary
        </h2>
        <p className="text-error-600 text-sm text-center py-8">
          Failed to load annual summary.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-4 shadow-md max-w-5xl">
      <h2 className="text-foreground font-semibold text-sm md:text-base mb-4">
        Annual Summary
      </h2>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-2 pb-2 border-b border-border">
        <span className="text-muted-foreground text-xs md:text-sm text-left">
          Year
        </span>
        <span className="text-muted-foreground text-xs md:text-sm text-right">
          <span className="hidden md:inline">Income</span>
          <span className="md:hidden">Inc.</span>
        </span>
        <span className="text-muted-foreground text-xs md:text-sm text-right">
          <span className="hidden md:inline">Expenses</span>
          <span className="md:hidden">Exp.</span>
        </span>
        <span className="text-muted-foreground text-xs md:text-sm text-right">
          <span className="hidden md:inline">Savings</span>
          <span className="md:hidden">Sav.</span>
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-2 py-3 border-b border-border/50"
            >
              <Skeleton className="h-4 w-16 bg-secondary-500" />
              <Skeleton className="h-4 w-20 ml-auto bg-secondary-500" />
              <Skeleton className="h-4 w-20 ml-auto bg-secondary-500" />
              <Skeleton className="h-4 w-20 ml-auto bg-secondary-500" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && years.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          No transaction data available.
        </p>
      )}

      {/* Data rows */}
      {!isLoading && years.length > 0 && (
        <div className="flex flex-col">
          {years.map((year) => {
            const isExpanded = expandedYears.has(year.year);

            return (
              <div key={year.year}>
                {/* Year row */}
                <div
                  className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-2 py-3 cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => toggleYear(year.year)}
                >
                  <div className="flex items-center gap-1 font-semibold text-sm md:text-base text-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    {year.year}
                  </div>
                  <span className="text-sm md:text-base text-foreground text-right font-semibold">
                    {formatCurrency(year.totalIncome)}
                  </span>
                  <span className="text-sm md:text-base text-foreground text-right font-semibold">
                    {formatCurrency(year.totalExpenses)}
                  </span>
                  <span
                    className={`text-sm md:text-base text-right font-semibold ${getSavingsColorClass(year.totalSavings)}`}
                  >
                    {formatCurrency(year.totalSavings)}
                  </span>
                </div>

                {/* Month rows */}
                {isExpanded &&
                  year.months.map((month: AnnualSummaryMonth) => (
                    <div
                      key={month.month}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-2 py-2.5 border-b border-border/50"
                    >
                      <span className="text-sm text-foreground pl-7">
                        {MONTH_NAMES[month.month - 1]}
                      </span>
                      <span className="text-sm text-foreground text-right">
                        {formatCurrency(month.totalIncome)}
                      </span>
                      <span className="text-sm text-foreground text-right">
                        {formatCurrency(month.totalExpenses)}
                      </span>
                      <span
                        className={`text-sm text-right ${getSavingsColorClass(month.totalSavings)}`}
                      >
                        {formatCurrency(month.totalSavings)}
                      </span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}