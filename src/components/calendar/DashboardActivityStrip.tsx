"use client"

import Link from "next/link"
import { useMemo } from "react"
import { format, subDays } from "date-fns"
import { CalendarX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { useCalendarSummary } from "@/hooks/useCalendarSummary"
import { CalendarDayCell } from "./CalendarDayCell"
import { CalendarDayBucket } from "@/types/calendar"

/** Same local-date convention as CalendarView - see its toLocalDayKey comment. */
function toLocalDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatSignedPeso(amount: number): string {
  const sign = amount >= 0 ? "+" : "-"
  return `${sign}₱${Math.abs(Math.round(amount)).toLocaleString("en-PH")}`
}

/**
 * Compact 7-day activity strip for the dashboard. Same cell component, same
 * encoding as the full calendar. Weekly rather than monthly is deliberate: a
 * month in one row gives each day ~10px on a phone, making the bars
 * sub-pixel. It is a link into the calendar view, not an expandable surface
 * - cells here mark today but carry no click/selection behavior.
 */
export function DashboardActivityStrip() {
  const today = useMemo(() => new Date(), [])
  const start = useMemo(() => format(subDays(today, 6), "yyyy-MM-dd"), [today])
  const end = useMemo(() => format(today, "yyyy-MM-dd"), [today])

  const { data, isLoading, error } = useCalendarSummary(start, end)

  const summaryByDate = useMemo(() => {
    const map = new Map<string, CalendarDayBucket>()
    for (const day of data?.days ?? []) {
      map.set(day.date, day)
    }
    return map
  }, [data])

  const max = data?.max ?? { expense: 0, income: 0 }
  const totals = data?.totals ?? { expense: 0, income: 0, net: 0 }
  const hasActivity = (data?.days.length ?? 0) > 0

  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 6; i >= 0; i--) {
      result.push(subDays(today, i))
    }
    return result
  }, [today])

  const todayKey = toLocalDayKey(today)

  return (
    <div className="flex flex-col gap-4" data-testid="dashboard-activity-strip">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Weekly Activity</h2>
        {!isLoading && !error && (
          <div className="flex flex-col items-end">
            <span className="text-xxs uppercase tracking-[0.08em] text-muted-foreground">
              Net this week
            </span>
            <span
              data-testid="dashboard-strip-net"
              className={
                "text-numeric text-xs font-medium " +
                (totals.net >= 0 ? "text-text-success" : "text-text-error")
              }
            >
              {formatSignedPeso(totals.net)}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-7 gap-1 [--cell-size:--spacing(11)]"
          data-testid="dashboard-strip-skeleton"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="min-h-(--cell-size) rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={CalendarX2}
          title="Couldn't load this week"
          description="Something went wrong fetching recent activity."
          variant="widget"
        />
      ) : !hasActivity ? (
        <EmptyState
          icon={CalendarX2}
          title="No activity this week"
          description="Transactions from the last 7 days will show up here."
          variant="widget"
        />
      ) : (
        <div className="[--cell-size:--spacing(11)]">
          <div className="grid grid-cols-7 gap-1" data-testid="dashboard-strip-weekdays">
            {days.map((day) => (
              <span
                key={`weekday-${toLocalDayKey(day)}`}
                className="text-center text-xxs uppercase tracking-[0.06em] text-muted-foreground"
              >
                {format(day, "EEEEE")}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {days.map((day) => {
              const key = toLocalDayKey(day)
              return (
                <CalendarDayCell
                  key={key}
                  day={day}
                  bucket={summaryByDate.get(key)}
                  max={max}
                  isToday={key === todayKey}
                  interactive={false}
                  className="min-h-(--cell-size)"
                />
              )
            })}
          </div>
        </div>
      )}

      <Link href="/transactions?view=calendar">
        <Button variant="outline" className="w-full">
          Open Calendar
        </Button>
      </Link>
    </div>
  )
}
