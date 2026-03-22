"use client"

import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const formatCurrency = (value: number) => {
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

const getChangeIcon = (change: number) => {
  if (change > 0) return TrendingUp
  if (change < 0) return TrendingDown
  return Minus
}

const getChangeColor = (change: number, isExpense = false) => {
  if (isExpense) {
    if (change < 0) return 'text-text-success'
    if (change > 0) return 'text-text-error'
    return 'text-muted-foreground'
  }
  if (change > 0) return 'text-text-success'
  if (change < 0) return 'text-text-error'
  return 'text-muted-foreground'
}

export const MobileHeroSummary = () => {
  const { summary, isLoading, error } = useMonthlySummary()

  if (isLoading) {
    return (
      <div className="md:hidden flex flex-col gap-3 -mt-6">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-12 rounded-lg" />
      </div>
    )
  }

  if (error || !summary) return null

  const incomeChange = summary.lastMonth.income > 0
    ? ((summary.currentMonth.income - summary.lastMonth.income) / summary.lastMonth.income) * 100
    : 0

  const expenseChange = summary.lastMonth.expenses > 0
    ? ((summary.currentMonth.expenses - summary.lastMonth.expenses) / summary.lastMonth.expenses) * 100
    : 0

  const IncomeIcon = getChangeIcon(incomeChange)
  const ExpenseIcon = getChangeIcon(expenseChange)

  return (
    <div className="md:hidden flex flex-col gap-3 -mt-6">
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-success-950/20 border border-success-900/30">
          <span className="text-muted-foreground text-xs">Income</span>
          <span className="text-foreground text-lg font-semibold">
            {formatCurrency(summary.currentMonth.income)}
          </span>
          <div className={`flex items-center gap-1 text-xs ${getChangeColor(incomeChange)}`}>
            <IncomeIcon className="w-3 h-3" />
            <span>{Math.abs(incomeChange).toFixed(0)}% vs last month</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-error-950/20 border border-error-900/30">
          <span className="text-muted-foreground text-xs">Expenses</span>
          <span className="text-foreground text-lg font-semibold">
            {formatCurrency(summary.currentMonth.expenses)}
          </span>
          <div className={`flex items-center gap-1 text-xs ${getChangeColor(expenseChange, true)}`}>
            <ExpenseIcon className="w-3 h-3" />
            <span>{Math.abs(expenseChange).toFixed(0)}% vs last month</span>
          </div>
        </div>
      </div>

      {/* Net Savings Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary-950/50 border border-border">
        <span className="text-muted-foreground text-sm">Net savings</span>
        <span className={`text-xl font-bold ${summary.currentMonth.savings >= 0 ? 'text-text-success' : 'text-text-error'}`}>
          {formatCurrency(summary.currentMonth.savings)}
        </span>
      </div>
    </div>
  )
}
