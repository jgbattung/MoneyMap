"use client"

import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetTotals } from './BudgetsTable'

const money = (n: number) => `${n < 0 ? '-' : ''}₱${formatCurrency(Math.abs(n))}`

const BudgetTotalsSummary = ({ totals }: { totals: BudgetTotals }) => {
  return (
    <div className="money-map-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Budgeted</span>
        <span className="text-numeric text-sm font-semibold">
          ₱{formatCurrency(totals.totalBudgeted)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Spent</span>
        <span className="text-numeric text-sm font-semibold">
          ₱{formatCurrency(totals.totalSpent)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm text-muted-foreground">Remaining</span>
        <span
          className={cn(
            'text-numeric text-sm font-semibold',
            totals.totalRemaining < 0 && 'text-text-error'
          )}
        >
          {money(totals.totalRemaining)}
        </span>
      </div>
    </div>
  )
}

export default BudgetTotalsSummary
