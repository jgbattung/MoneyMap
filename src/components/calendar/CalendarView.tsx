"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { CalendarX2 } from "lucide-react"
import type { DayButton } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { useCalendarSummary } from "@/hooks/useCalendarSummary"
import { useEarliestTransaction } from "@/hooks/useEarliestTransaction"
import { CalendarDayCell } from "./CalendarDayCell"
import { CalendarDayPanel } from "./CalendarDayPanel"
import { CalendarDayDrawer } from "./CalendarDayDrawer"
import EditExpenseDrawer from "@/components/forms/EditExpenseDrawer"
import EditIncomeDrawer from "@/components/forms/EditIncomeDrawer"
import EditTransferDrawer from "@/components/forms/EditTransferDrawer"
import { CalendarDayBucket, CalendarDayTransaction } from "@/types/calendar"

/**
 * `md` breakpoint (768px), matching the rest of the app's responsive
 * convention. Drives whether a day selection opens the sticky desktop panel
 * (always in the DOM, just updates its content) or pops the mobile bottom
 * Drawer (a real vaul dialog that must not also appear on desktop).
 */
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)"

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  return isDesktop
}

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

/**
 * Per-render grid data for the day buttons. Passed by context rather than by
 * closing over it in an inline component, so the `DayButton` identity handed
 * to react-day-picker stays stable across refetches - an unstable component
 * type would remount all 42 day buttons (and drop DOM focus) every time the
 * summary changes.
 */
const CalendarGridDataContext = React.createContext<{
  summaryByDate: Map<string, CalendarDayBucket>
  max: { expense: number; income: number }
}>({ summaryByDate: new Map(), max: { expense: 0, income: 0 } })

/**
 * The custom react-day-picker `DayButton`.
 *
 * CRITICAL: `...buttonProps` must be forwarded to `CalendarDayCell`. react-day-picker
 * supplies `tabIndex` (roving: 0 on the focus target, -1 elsewhere), `aria-label`,
 * `onClick`, `onKeyDown`, `onFocus`, `onBlur` and `disabled` here (see DayPicker's
 * `components.DayButton` call site). Dropping them breaks arrow-key navigation
 * outright, makes every day a tab stop, and leaves the button's accessible name as
 * the bare cell text. The `modifiers.focused` -> `focus()` effect is the other half:
 * it is how react-day-picker moves real DOM focus as the arrow keys change the
 * focused day. Both mirror the repo's own `CalendarDayButton` in `ui/calendar.tsx`.
 */
function CalendarGridDayButton({
  day,
  modifiers,
  className,
  ...buttonProps
}: React.ComponentProps<typeof DayButton>) {
  const { summaryByDate, max } = React.useContext(CalendarGridDataContext)
  const ref = React.useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <CalendarDayCell
      {...buttonProps}
      ref={ref}
      day={day.date}
      bucket={summaryByDate.get(toLocalDayKey(day.date))}
      max={max}
      isToday={modifiers.today}
      isSelected={modifiers.selected}
      isOutside={modifiers.outside}
      className={className}
    />
  )
}

export function CalendarView() {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("")
  const [editExpenseOpen, setEditExpenseOpen] = useState(false)
  const [editIncomeOpen, setEditIncomeOpen] = useState(false)
  const [editTransferOpen, setEditTransferOpen] = useState(false)

  const handleTransactionClick = useCallback(
    (id: string, type: CalendarDayTransaction["type"]) => {
      setSelectedTransactionId(id)
      if (type === "EXPENSE") setEditExpenseOpen(true)
      else if (type === "INCOME") setEditIncomeOpen(true)
      else setEditTransferOpen(true)
    },
    []
  )

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

  /**
   * Clearing the selection on month change keeps the day panel honest: without
   * it, navigating away leaves the panel describing a day that is no longer
   * anywhere on the grid.
   */
  const handleMonthChange = useCallback((next: Date) => {
    setMonth(next)
    setSelectedDate(null)
  }, [])

  const gridData = useMemo(() => ({ summaryByDate, max }), [summaryByDate, max])

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedDate(null)
  }, [])

  return (
    <div data-testid="calendar-view">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">{format(month, "MMMM yyyy")}</h2>
            {!isLoading && !error && (
              <div className="flex flex-wrap items-center gap-4" data-testid="calendar-month-totals">
                <div className="flex flex-col">
                  <span className="text-xxs uppercase tracking-[0.08em] text-muted-foreground">
                    Income
                  </span>
                  <span className="text-numeric text-xs font-medium text-text-success">
                    +{formatPeso(totals.income)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xxs uppercase tracking-[0.08em] text-muted-foreground">
                    Expenses
                  </span>
                  <span className="text-numeric text-xs font-medium text-text-error">
                    -{formatPeso(totals.expense)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xxs uppercase tracking-[0.08em] text-muted-foreground">
                    Net
                  </span>
                  <span
                    data-testid="calendar-month-net"
                    className={
                      "text-numeric text-xs font-medium " +
                      (totals.net >= 0 ? "text-text-success" : "text-text-error")
                    }
                  >
                    {formatSignedPeso(totals.net)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-7 gap-1 [--cell-size:--spacing(11)] md:[--cell-size:--spacing(20)]"
              data-testid="calendar-skeleton"
            >
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="min-h-(--cell-size) rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* The grid stays mounted on error so its month nav remains usable -
                  a failed range must not strand the user on a dead month with no
                  way to navigate away or retry short of a page reload. */}
              <CalendarGridDataContext.Provider value={gridData}>
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={handleSelect}
                  month={month}
                  onMonthChange={handleMonthChange}
                  startMonth={startMonth}
                  showOutsideDays
                  className="[--cell-size:--spacing(11)] md:[--cell-size:--spacing(20)] w-full"
                  classNames={{
                    day: "relative w-full h-full min-h-(--cell-size) p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day select-none",
                  }}
                  components={{ DayButton: CalendarGridDayButton }}
                />
              </CalendarGridDataContext.Provider>

              {error ? (
                <EmptyState
                  icon={CalendarX2}
                  title="Couldn't load the calendar"
                  description="Something went wrong fetching this month's activity. Try again shortly."
                  variant="widget"
                />
              ) : (
                !hasActivity && (
                  <EmptyState
                    icon={CalendarX2}
                    title="No activity this month"
                    description="Transactions for this month will show up here once you add some."
                    variant="widget"
                  />
                )
              )}

              <div
                className="flex flex-wrap items-center gap-3 text-xxs text-muted-foreground"
                data-testid="calendar-legend"
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3 rounded-full bg-text-success" aria-hidden="true" />
                  Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3 rounded-full bg-text-error" aria-hidden="true" />
                  Expenses
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-secondary-400" aria-hidden="true" />
                  Transfer
                </span>
                <span>scaled per channel against the heaviest day in view</span>
              </div>
            </>
          )}
        </div>

        <CalendarDayPanel
          date={selectedDate}
          onTransactionClick={handleTransactionClick}
          className="hidden md:block"
        />
      </div>

      <CalendarDayDrawer
        date={selectedDate}
        open={!isDesktop && !!selectedDate}
        onOpenChange={handleDrawerOpenChange}
        onTransactionClick={handleTransactionClick}
      />

      {/* Edit drawers — same components TransactionsMobileView wires (lines ~500-518), reused as-is.
          Unlike that page, CalendarView has no separate desktop table with inline editing, so these
          are the calendar's only edit surface regardless of viewport; EditTransferDrawer's className
          is intentionally left unrestricted here (TransactionsMobileView passes "block md:hidden"
          because desktop there uses a different, inline-editable table). */}
      <EditExpenseDrawer
        open={editExpenseOpen}
        onOpenChange={setEditExpenseOpen}
        expenseId={selectedTransactionId}
      />
      <EditIncomeDrawer
        open={editIncomeOpen}
        onOpenChange={setEditIncomeOpen}
        incomeTransactionId={selectedTransactionId}
      />
      <EditTransferDrawer
        open={editTransferOpen}
        onOpenChange={setEditTransferOpen}
        className=""
        transferId={selectedTransactionId}
      />
    </div>
  )
}
