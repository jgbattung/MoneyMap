"use client"

import { cn } from "@/lib/utils"
import { useCalendarDay } from "@/hooks/useCalendarDay"
import { CalendarDayDetail } from "./CalendarDayDetail"
import { CalendarDayTransaction } from "@/types/calendar"

export interface CalendarDayPanelProps {
  date: string | null
  onTransactionClick: (id: string, type: CalendarDayTransaction["type"]) => void
  className?: string
}

/**
 * Desktop sticky side panel rendering the shared CalendarDayDetail body.
 */
export function CalendarDayPanel({ date, onTransactionClick, className }: CalendarDayPanelProps) {
  const { data, isLoading, error } = useCalendarDay(date)

  return (
    <div
      data-testid="calendar-day-panel"
      className={cn("money-map-card sticky top-4 self-start", className)}
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
