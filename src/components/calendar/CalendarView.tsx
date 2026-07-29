"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { CalendarX2 } from "lucide-react"
import type { DayButton } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { useCalendarSummary } from "@/hooks/useCalendarSummary"
import { useEarliestTransaction } from "@/hooks/useEarliestTransaction"
import { CalendarDayCell } from "./CalendarDayCell"
import { CalendarDayBucket } from "@/types/calendar"

/**
 * The app assumes a UTC+8 viewer (see project-context.md "Date Storage
 * Shapes"), so a calendar cell's LOCAL date is the same calendar day the
 * server bucketed by UTC day. react-day-picker builds its grid from local
 * `Date` objects, so matching against the API's UTC-derived bucket keys must
 * use local date parts here, never `toISOString()` (which would shift the
 * key by a day for any viewer not exactly at UTC+0).
 */
function toLocalDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatSignedPeso(amount: number): string {
  const sign = amount >= 0 ? "+" : "-"
  return `${sign}₱${Math.abs(Math.round(amount)).toLocaleString("en-PH")}`
}

function formatPeso(amount: number): string {
  return `₱${Math.abs(Math.round(amount)).toLocaleString("en-PH")}`
}

export function CalendarView() {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const {
    earliestMonth,
    earliestYear,
    isLoading: earliestLoading,
  } = useEarliestTransaction()

  const startMonth = useMemo(() => {
    if (earliestLoading || earliestMonth == null || earliestYear == null) {
      return undefined
    }
    return new Date(earliestYear, earliestMonth - 1, 1)
  }, [earliestLoading, earliestMonth, earliestYear])

  const rangeStart = useMemo(() => format(startOfMonth(month), "yyyy-MM-dd"), [month])
  const rangeEnd = useMemo(() => format(endOfMonth(month), "yyyy-MM-dd"), [month])

  const { data, isLoading, error } = useCalendarSummary(rangeStart, rangeEnd)

  const summaryByDate = useMemo(() => {
    const map = new Map<string, CalendarDayBucket>()
    for (const day of data?.days ?? []) {
      map.set(day.date, day)
    }
    return map
  }, [data])

  const max = useMemo(() => data?.max ?? { expense: 0, income: 0 }, [data]);
  const totals = data?.totals ?? { expense: 0, income: 0, net: 0 }
  const hasActivity = (data?.days.length ?? 0) > 0

  const selected = useMemo(
    () => (selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined),
    [selectedDate]
  )

  const handleSelect = useCallback((date: Date | undefined) => {
    if (!date) return
    setSelectedDate(toLocalDayKey(date))
  }, [])

  const DayButtonAdapter = useCallback(
    ({ day, modifiers, className }: React.ComponentProps<typeof DayButton>) => {
      const key = toLocalDayKey(day.date)
      return (
        <CalendarDayCell
          day={day.date}
          bucket={summaryByDate.get(key)}
          max={max}
          isToday={modifiers.today}
          isSelected={modifiers.selected}
          isOutside={modifiers.outside}
          disabled={modifiers.disabled}
          onClick={() => handleSelect(day.date)}
          className={className}
        />
      )
    },
    [summaryByDate, max, handleSelect]
  )

  return (
    <div className="flex flex-col gap-4" data-testid="calendar-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">{format(month, "MMMM yyyy")}</h2>
        {!isLoading && !error && (
          <div className="flex items-center gap-4">
            <span className="text-numeric text-xs text-text-success">
              +{formatPeso(totals.income)}
            </span>
            <span className="text-numeric text-xs text-text-error">
              -{formatPeso(totals.expense)}
            </span>
            <span
              data-testid="calendar-month-net"
              className={
                "text-numeric text-xs font-semibold " +
                (totals.net >= 0 ? "text-text-success" : "text-text-error")
              }
            >
              {formatSignedPeso(totals.net)}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-1" data-testid="calendar-skeleton">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={CalendarX2}
          title="Couldn't load the calendar"
          description="Something went wrong fetching this month's activity. Try again shortly."
          variant="widget"
        />
      ) : (
        <>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            startMonth={startMonth}
            showOutsideDays
            className="[--cell-size:--spacing(11)] md:[--cell-size:--spacing(20)] w-full"
            classNames={{
              day: "relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day select-none",
            }}
            components={{ DayButton: DayButtonAdapter }}
          />

          {!hasActivity && (
            <EmptyState
              icon={CalendarX2}
              title="No activity this month"
              description="Transactions for this month will show up here once you add some."
              variant="widget"
            />
          )}

          <p className="text-xs text-muted-foreground">
            Income (mint) stacks above expenses (coral); a slate dot marks a transfer. Bars are
            scaled per channel against the heaviest day in view.
          </p>
        </>
      )}
    </div>
  )
}
