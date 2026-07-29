"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useCalendarDay } from "@/hooks/useCalendarDay"
import { CalendarDayDetail } from "./CalendarDayDetail"
import { CalendarDayTransaction } from "@/types/calendar"

export interface CalendarDayDrawerProps {
  date: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionClick: (id: string, type: CalendarDayTransaction["type"]) => void
}

/**
 * Mobile bottom drawer rendering the shared CalendarDayDetail body.
 */
export function CalendarDayDrawer({
  date,
  open,
  onOpenChange,
  onTransactionClick,
}: CalendarDayDrawerProps) {
  const { data, isLoading, error } = useCalendarDay(date)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid="calendar-day-drawer">
        <DrawerHeader>
          <DrawerTitle>Day activity</DrawerTitle>
          <DrawerDescription>Income, expenses, and transactions for the selected day.</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">
          <CalendarDayDetail
            date={date}
            data={data}
            isLoading={isLoading}
            error={error}
            onTransactionClick={onTransactionClick}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
