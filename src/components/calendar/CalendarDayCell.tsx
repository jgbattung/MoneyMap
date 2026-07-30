"use client"

import * as React from "react"
import { CalendarDayBucket } from "@/types/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Extends the full set of native button props so react-day-picker's own
 * `DayButton` props (`tabIndex`, `aria-label`, `onKeyDown`, `onFocus`,
 * `onBlur`, `disabled`, `ref`, ...) can be forwarded straight through. Those
 * props are what make the grid keyboard-navigable and screen-reader legible;
 * dropping them silently reduces the cell to a mouse-only control.
 */
export interface CalendarDayCellProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  /** The calendar day this cell represents. */
  day: Date
  /** This day's activity bucket, or undefined for a day with no activity. */
  bucket?: CalendarDayBucket
  /** Per-channel maxima across the visible window, driving bar width. */
  max: { expense: number; income: number }
  isToday?: boolean
  isSelected?: boolean
  isOutside?: boolean
  /**
   * Whether this cell is a real control. Defaults to `true` (the calendar
   * grid). Pass `false` for read-only surfaces like the dashboard strip,
   * which have no click handler to give a cell - rendering a `<button>`
   * there ships a false affordance (hover highlight, focus ring, tab stop)
   * for a control that does nothing. When `false`, renders a plain `<div>`
   * with no button semantics and no hover/focus styling.
   */
  interactive?: boolean
  /**
   * Whether this month's activity is still being fetched. The day number is
   * known without the data, so it keeps rendering; only the figures that
   * depend on the response are replaced with placeholders. This lets the
   * calendar stay mounted while loading - see CalendarView - so the month
   * caption and prev/next nav never disappear and the grid never reflows.
   */
  isLoading?: boolean
}

/**
 * Bar width as a percentage of the channel maximum, with a 6% floor so any
 * non-zero activity is always visible instead of reading as empty.
 */
function barWidthPercent(amount: number, max: number): number {
  if (amount <= 0) return 0
  if (max <= 0) return 100
  return Math.max(6, (amount / max) * 100)
}

function formatWholePeso(amount: number): string {
  return Math.round(Math.abs(amount)).toLocaleString("en-PH")
}

/**
 * Local calendar-day key ("YYYY-MM-DD") for the `data-day` attribute.
 * Deliberately NOT `toISOString()` - `day` is a local-midnight Date built by
 * react-day-picker, and `.toISOString()` converts to UTC first, which rolls
 * the date back a day for any positive-UTC-offset viewer (e.g. the app's
 * assumed UTC+8). Must stay local to match CalendarView's own bucket-key
 * matching (see CalendarView.tsx's `toLocalDayKey`).
 */
function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * The custom react-day-picker DayButton for the Activity Calendar. Renders
 * the day number, an optional desktop-only net figure, and a footer with
 * income/expense bars plus a permanently-reserved transfer-dot gutter so bar
 * lengths stay comparable whether or not a day has a transfer.
 */
export function CalendarDayCell({
  day,
  bucket,
  max,
  isToday,
  isSelected,
  isOutside,
  interactive = true,
  isLoading = false,
  className,
  ...buttonProps
}: CalendarDayCellProps) {
  const hasActivity =
    !isLoading &&
    !!bucket &&
    bucket.expenseCount + bucket.incomeCount + bucket.transferCount > 0
  const hasTransfer = !!bucket && bucket.transferCount > 0
  const net = bucket ? bucket.income - bucket.expense : 0

  const incomeWidth = bucket ? barWidthPercent(bucket.income, max.income) : 0
  const expenseWidth = bucket ? barWidthPercent(bucket.expense, max.expense) : 0

  const sharedClassName = cn(
    // `min-h-(--cell-size)` must live on the cell itself, not only on the
    // grid slot around it. `h-full` is `height: 100%`, which resolves against
    // the PARENT's height - and the parent only carries a min-height, so the
    // cell would fall back to content height and a day with no activity would
    // render about half as tall as one with bars. Owning the min-height here
    // makes every cell uniform in both the month grid and the dashboard strip,
    // and keeps it driven by the `--cell-size` custom property (which each
    // surface sets for its own breakpoints) rather than a hardcoded pixel value.
    "group/day-cell relative flex h-full min-h-(--cell-size) w-full flex-col items-start gap-1 rounded-lg p-1.5 text-left transition-colors",
    interactive && "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    hasActivity ? "bg-card/40 border border-border/40" : "border border-transparent",
    isSelected && "ring-2 ring-primary/60",
    isOutside && "opacity-40",
    className
  )

  const content = (
    <>
      <span
        className={cn(
          "text-xs font-medium leading-[1.2]",
          isToday
            ? "text-primary"
            : hasActivity
              ? "text-foreground"
              : "text-muted-foreground/50"
        )}
      >
        {day.getDate()}
      </span>

      {isLoading && !isOutside && (
        <Skeleton
          data-testid="cell-net-skeleton"
          className="hidden md:block h-3 w-12 rounded"
        />
      )}

      {hasActivity && (
        <span
          className={cn(
            // `text-xs` (12px). It shares the day number's size rather than
            // sitting a step below it; they stay distinguishable by family
            // (mono vs sans) and by the gain/loss colour. `text-xxs` and
            // `text-xxxs` were both tried and read as too small for a peso
            // figure at this density.
            "hidden md:block text-numeric text-xs leading-none",
            net >= 0 ? "text-text-success" : "text-text-error"
          )}
        >
          {net >= 0 ? "+" : "-"}₱{formatWholePeso(net)}
        </span>
      )}

      <div className="mt-auto flex w-full items-end gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {isLoading && !isOutside && (
            <Skeleton
              data-testid="cell-bar-skeleton"
              className="h-[3px] w-2/3 rounded-full"
            />
          )}
          {incomeWidth > 0 && (
            <span
              data-testid="income-bar"
              className="h-[3px] rounded-full bg-text-success"
              style={{ width: `${incomeWidth}%` }}
            />
          )}
          {expenseWidth > 0 && (
            <span
              data-testid="expense-bar"
              className="h-[3px] rounded-full bg-text-error"
              style={{ width: `${expenseWidth}%` }}
            />
          )}
        </div>
        {/* Permanently reserved gutter: bars can never run under the dot,
            and bar lengths stay comparable across days regardless of
            whether this day actually has a transfer. */}
        <div className="flex w-1 flex-shrink-0 items-center justify-center">
          {hasTransfer && (
            <span
              data-testid="transfer-dot"
              className="h-1 w-1 rounded-full bg-secondary-400"
            />
          )}
        </div>
      </div>
    </>
  )

  if (!interactive) {
    return (
      <div
        data-slot="calendar-day-cell"
        data-day={toLocalDateKey(day)}
        data-selected={isSelected || undefined}
        data-today={isToday || undefined}
        data-has-activity={hasActivity || undefined}
        className={sharedClassName}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      {...buttonProps}
      type="button"
      data-slot="calendar-day-cell"
      data-day={toLocalDateKey(day)}
      data-selected={isSelected || undefined}
      data-today={isToday || undefined}
      data-has-activity={hasActivity || undefined}
      className={sharedClassName}
    >
      {content}
    </button>
  )
}
