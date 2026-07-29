"use client"

import { format } from "date-fns"
import { CalendarX2 } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import CompactTransactionCard from "@/components/transactions/CompactTransactionCard"
import { SkeletonCompactTransactionCard } from "@/components/transactions/SkeletonCompactTransactionCard"
import { CalendarDayResponse, CalendarDayTransaction } from "@/types/calendar"

export interface CalendarDayDetailProps {
  /** The selected day, "YYYY-MM-DD", or null when nothing is selected. */
  date: string | null
  data?: CalendarDayResponse
  isLoading: boolean
  error?: string | null
  onTransactionClick: (id: string, type: CalendarDayTransaction["type"]) => void
}

function formatSignedPeso(amount: number): string {
  const sign = amount >= 0 ? "+" : "-"
  return `${sign}₱${Math.abs(Math.round(amount)).toLocaleString("en-PH")}`
}

/**
 * The shared body rendered by both CalendarDayPanel (desktop) and
 * CalendarDayDrawer (mobile) - full date heading, the three figures, and
 * the day's transactions via the existing CompactTransactionCard. Neither
 * container duplicates this markup.
 */
export function CalendarDayDetail({
  date,
  data,
  isLoading,
  error,
  onTransactionClick,
}: CalendarDayDetailProps) {
  if (!date) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No day selected"
        description="Pick a day on the calendar to see its transactions."
        variant="widget"
      />
    )
  }

  const heading = format(new Date(`${date}T00:00:00`), "EEEE, MMMM d, yyyy")

  return (
    <div className="flex flex-col gap-4" data-testid="calendar-day-detail">
      <h3 className="text-sm font-medium text-foreground">{heading}</h3>

      {isLoading ? (
        <div className="flex flex-col gap-2" data-testid="calendar-day-detail-skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCompactTransactionCard key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={CalendarX2}
          title="Couldn't load this day"
          description="Something went wrong fetching this day's transactions. Try again shortly."
          variant="widget"
        />
      ) : !data || data.transactions.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No transactions"
          description="Nothing happened on this day."
          variant="widget"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Income</span>
              <span className="text-numeric text-sm font-semibold text-text-success">
                +₱{Math.round(data.totals.income).toLocaleString("en-PH")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Expenses</span>
              <span className="text-numeric text-sm font-semibold text-text-error">
                -₱{Math.round(data.totals.expense).toLocaleString("en-PH")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Net</span>
              <span
                data-testid="calendar-day-net"
                className={
                  "text-numeric text-sm font-semibold " +
                  (data.totals.net >= 0 ? "text-text-success" : "text-text-error")
                }
              >
                {formatSignedPeso(data.totals.net)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {data.transactions.map((transaction) => (
              <CompactTransactionCard
                key={transaction.id}
                id={transaction.id}
                type={transaction.type}
                name={transaction.name}
                amount={transaction.amount}
                date={transaction.date}
                category={transaction.categoryName}
                subcategory={transaction.subcategoryName}
                account={transaction.accountName}
                toAccount={transaction.toAccountName}
                tags={transaction.tags}
                onClick={() => onTransactionClick(transaction.id, transaction.type)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
