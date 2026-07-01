"use client"

import { BudgetStatusItem } from '@/hooks/useBudgetStatus'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BudgetTotals {
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
}

interface BudgetsTableProps {
  budgets: BudgetStatusItem[]
  totals: BudgetTotals
  onRowClick: (id: string) => void
}

// Signed peso string, e.g. "-₱1,200.00".
const money = (n: number) => `${n < 0 ? '-' : ''}₱${formatCurrency(Math.abs(n))}`

// Progress-bar color mirrors the BudgetStatus widget's logic.
const progressColor = (b: BudgetStatusItem): string => {
  const spendingWithoutBudget = b.monthlyBudget == null && b.spentAmount > 0
  if (spendingWithoutBudget || b.isOverBudget) return 'bg-text-error'
  if (b.spentAmount > 0 && b.progressPercentage >= 80) return 'bg-brand-gold'
  if (b.spentAmount > 0) return 'bg-text-success'
  return 'bg-secondary-400'
}

const BudgetsTable = ({ budgets, totals, onRowClick }: BudgetsTableProps) => {
  const overallPct = totals.totalBudgeted > 0
    ? Math.round((totals.totalSpent / totals.totalBudgeted) * 100)
    : 0

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-4">Category</TableHead>
            <TableHead className="p-4">Budgeted</TableHead>
            <TableHead className="p-4">Spent</TableHead>
            <TableHead className="p-4">Remaining</TableHead>
            <TableHead className="p-4 w-[180px]">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((b) => {
            const hasBudget = b.monthlyBudget != null
            const remaining = (b.monthlyBudget ?? 0) - b.spentAmount
            return (
              <TableRow
                key={b.id}
                onClick={() => onRowClick(b.id)}
                className="cursor-pointer"
              >
                <TableCell className="p-4 font-medium">{b.name}</TableCell>
                <TableCell className="p-4 text-numeric text-muted-foreground">
                  {hasBudget ? `₱${formatCurrency(b.monthlyBudget!)}` : '—'}
                </TableCell>
                <TableCell className="p-4 text-numeric">
                  ₱{formatCurrency(b.spentAmount)}
                </TableCell>
                <TableCell
                  className={cn('p-4 text-numeric', hasBudget && remaining < 0 && 'text-text-error')}
                >
                  {hasBudget ? money(remaining) : '—'}
                </TableCell>
                <TableCell className="p-4">
                  {hasBudget ? (
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-secondary-400/30 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full', progressColor(b))}
                          style={{ width: `${Math.min(b.progressPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-numeric text-xs text-muted-foreground shrink-0 w-10 text-right">
                        {Math.round(b.progressPercentage)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No budget set</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 hover:bg-transparent">
            <TableCell className="p-4 font-semibold">Total</TableCell>
            <TableCell className="p-4 text-numeric font-semibold">
              ₱{formatCurrency(totals.totalBudgeted)}
            </TableCell>
            <TableCell className="p-4 text-numeric font-semibold">
              ₱{formatCurrency(totals.totalSpent)}
            </TableCell>
            <TableCell
              className={cn('p-4 text-numeric font-semibold', totals.totalRemaining < 0 && 'text-text-error')}
            >
              {money(totals.totalRemaining)}
            </TableCell>
            <TableCell className="p-4 text-numeric font-semibold text-muted-foreground">
              {overallPct}%
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export default BudgetsTable
