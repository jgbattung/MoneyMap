"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { CalendarX2 } from "lucide-react"
import type { DayButton } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import { useCalendarSummary } from "@/hooks/useCalendarSummary"
import { useEarliestTransaction } from "@/hooks/useEarliestTransaction"
import { CalendarDayCell } from "./CalendarDayCell"
import { CalendarDayPanel } from "./CalendarDayPanel"
import EditExpenseDrawer from "@/components/forms/EditExpenseDrawer"
import EditIncomeDrawer from "@/components/forms/EditIncomeDrawer"
import EditTransferDrawer from "@/components/forms/EditTransferDrawer"
import { CalendarDayBucket, CalendarDayTransaction } from "@/types/calendar"

/**
 * `md` breakpoint (768px), matching the rest of the app's responsive
 * convention. Read imperatively inside the scroll effect rather than held in
 * state: it only decides whether to scroll, never what to render, so putting
 * it in state would re-render the whole grid on every viewport change for no
 * visual difference.
 */
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)"

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
  isLoading: boolean
}>({ summaryByDate: new Map(), max: { expense: 0, income: 0 }, isLoading: false })

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
  const { summaryByDate, max, isLoading } = React.useContext(CalendarGridDataContext)
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
      isLoading={isLoading}
      className={className}
    />
  )
}

export function CalendarView() {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const dayPanelRef = React.useRef<HTMLDivElement>(null)

  /**
   * On mobile the day panel sits below the grid, so a selection would
   * otherwise land off-screen and read as "nothing happened". Desktop renders
   * it beside the grid and needs no scroll. Honours `prefers-reduced-motion`
   * like the rest of the app.
   */
  useEffect(() => {
    if (!selectedDate) return
    if (typeof window === "undefined" || !window.matchMedia) return
    if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    dayPanelRef.current?.scrollIntoView?.({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    })
  }, [selectedDate])

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

  const gridData = useMemo(
    () => ({ summaryByDate, max, isLoading }),
    [summaryByDate, max, isLoading]
  )

  const monthFigures = useMemo(
    () => [
      {
        key: "income",
        label: "Income",
        value: `+${formatPeso(totals.income)}`,
        tone: "text-text-success",
        testId: undefined,
      },
      {
        key: "expenses",
        label: "Expenses",
        value: `-${formatPeso(totals.expense)}`,
        tone: "text-text-error",
        testId: undefined,
      },
      {
        key: "net",
        label: "Net",
        value: formatSignedPeso(totals.net),
        tone: totals.net >= 0 ? "text-text-success" : "text-text-error",
        testId: "calendar-month-net",
      },
    ],
    [totals.income, totals.expense, totals.net]
  )

  return (
    <div data-testid="calendar-view">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          {/* No month heading here on purpose. react-day-picker already renders
              the month caption, and it is bound to the prev/next chevrons as a
              single control (`rdp-nav` spans the grid, caption centred between
              them). A heading here duplicated that text verbatim; removing the
              caption instead would leave two chevrons with a gap between them
              and would mean reimplementing the `startMonth` bounds logic by
              hand. The totals below carry their own labels and re-read against
              whichever month the caption shows. */}
          <div
            className="flex flex-wrap items-center gap-4"
            data-testid="calendar-month-totals"
          >
            {monthFigures.map((figure) => (
              <div key={figure.key} className="flex flex-col">
                <span className="text-xxs uppercase tracking-[0.08em] text-muted-foreground">
                  {figure.label}
                </span>
                {/* Rendered in every state so the header keeps its height - it
                    is the only thing above the grid, so collapsing it would
                    shove the whole calendar upward mid-fetch. */}
                {isLoading ? (
                  <Skeleton
                    data-testid={`month-total-skeleton-${figure.key}`}
                    className="mt-0.5 h-3.5 w-20 rounded"
                  />
                ) : (
                  <span
                    data-testid={figure.testId}
                    className={cn("text-numeric text-xs font-medium", !error && figure.tone)}
                  >
                    {error ? "—" : figure.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* The grid stays mounted while LOADING as well as on error. Swapping
              it for a standalone skeleton grid unmounted the whole DayPicker,
              which took its `rdp-nav` (month caption + prev/next chevrons) with
              it - so the month heading vanished and the user could not navigate
              while a fetch was in flight, and the grid reflowed on every settle.
              Loading is expressed inside the cells instead: the day numbers are
              known without the response, so only the figures that depend on it
              become placeholders. */}
          <div data-testid={isLoading ? "calendar-skeleton" : undefined}>
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
          </div>

          {!isLoading &&
            (error ? (
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
            ))}

          {/* Static content, so it stays put through a fetch rather than
              popping in on settle. */}
          <div
            className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
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
        </div>

        {/* One panel for both breakpoints: beside the grid on desktop, stacked
            beneath it on mobile. It used to be a vaul Drawer on mobile, which
            meant the day detail covered the calendar you were browsing, and an
            edit drawer opened as a second modal on top of the first - the only
            place in the app where that happened. Inline keeps the grid visible
            while reading a day, and lets the edit drawer open over the page
            exactly like every other list. */}
        <CalendarDayPanel
          ref={dayPanelRef}
          date={selectedDate}
          onTransactionClick={handleTransactionClick}
        />
      </div>

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
