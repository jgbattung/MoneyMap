"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useCalendarDay } from "@/hooks/useCalendarDay"
import { CalendarDayDetail } from "./CalendarDayDetail"
import { CalendarDayTransaction } from "@/types/calendar"

export interface CalendarDayPanelProps {
  date: string | null
  onTransactionClick: (id: string, type: CalendarDayTransaction["type"]) => void
  className?: string
  /** Lets CalendarView scroll this into view on mobile when a day is picked. */
  ref?: React.Ref<HTMLDivElement>
}

/**
 * The day detail panel, rendered at every breakpoint: beside the grid on
 * desktop, stacked beneath it on mobile. Sticky only from `md` up - on mobile
 * it is the bottom of the page, so sticking it would pin it over the calendar
 * and recreate the occlusion the drawer had.
 */
export function CalendarDayPanel({
  date,
  onTransactionClick,
  className,
  ref,
}: CalendarDayPanelProps) {
  const { data, isLoading, error } = useCalendarDay(date)

  return (
    <div
      ref={ref}
      data-testid="calendar-day-panel"
      className={cn("money-map-card scroll-mt-4 md:sticky md:top-4 md:self-start", className)}
    >
      <CalendarDayDetail
        date={date}
        data={data}
        isLoading={isLoading}
        error={error}
        onTransactionClick={onTransactionClick}
      />
    </div>
  )
}
