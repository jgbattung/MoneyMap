"use client"

import React from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'

const MonthlySummaryChart = () => {
  const { summary, isLoading, error } = useMonthlySummary();

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Monthly Summary</p>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Monthly Summary</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold text-sm'>Failed to load summary</p>
          <p className='text-muted-foreground text-xs mt-1'>{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Monthly Summary</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground text-sm'>No data available</p>
        </div>
      </div>
    );
  }

  // Calculate percentage changes
  const incomeChange = summary.lastMonth.income > 0
    ? ((summary.currentMonth.income - summary.lastMonth.income) / summary.lastMonth.income) * 100
    : 0;
  
  const expenseChange = summary.lastMonth.expenses > 0
    ? ((summary.currentMonth.expenses - summary.lastMonth.expenses) / summary.lastMonth.expenses) * 100
    : 0;

  const getChangeIcon = (change: number) => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Minus;
  };

  const getChangeColor = (change: number, isExpense = false) => {
    if (isExpense) {
      // For expenses, negative is good (less spending)
      if (change < 0) return 'text-success-600';
      if (change > 0) return 'text-error-600';
      return 'text-muted-foreground';
    }
    // For income, positive is good
    if (change > 0) return 'text-success-600';
    if (change < 0) return 'text-error-600';
    return 'text-muted-foreground';
  };

  const IncomeIcon = getChangeIcon(incomeChange);
  const ExpenseIcon = getChangeIcon(expenseChange);

  return (
    <div className='flex flex-col gap-4'>
      {/* Title */}
      <p className='text-foreground font-semibold text-sm md:text-base'>Monthly Summary</p>

      {/* Income & Expense Cards */}
      <div className='grid grid-cols-2 gap-3'>
        {/* Income Card */}
        <div className='flex flex-col gap-1 p-3 rounded-md bg-success-950/20 border border-success-900/30'>
          <span className='text-muted-foreground text-xs'>Income</span>
          <div className='flex items-end gap-1'>
            <span className='text-foreground text-lg font-semibold'>
              {formatCurrency(summary.currentMonth.income)}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${getChangeColor(incomeChange)}`}>
            <IncomeIcon className='w-3 h-3' />
            <span>{Math.abs(incomeChange).toFixed(0)}% from {formatCurrency(summary.lastMonth.income)}</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className='flex flex-col gap-1 p-3 rounded-md bg-error-950/20 border border-error-900/30'>
          <span className='text-muted-foreground text-xs'>Expenses</span>
          <div className='flex items-end gap-1'>
            <span className='text-foreground text-lg font-semibold'>
              {formatCurrency(summary.currentMonth.expenses)}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${getChangeColor(expenseChange, true)}`}>
            <ExpenseIcon className='w-3 h-3' />
            <span>{Math.abs(expenseChange).toFixed(0)}% from {formatCurrency(summary.lastMonth.expenses)}</span>
          </div>
        </div>
      </div>

      {/* Net Savings */}
      <div className='flex items-center justify-between p-3 rounded-md bg-secondary-950/50 border border-border'>
        <span className='text-muted-foreground text-sm'>Net savings this month</span>
        <span className={`text-xl font-bold ${summary.currentMonth.savings >= 0 ? 'text-success-600' : 'text-error-600'}`}>
          {formatCurrency(summary.currentMonth.savings)}
        </span>
      </div>
    </div>
  );
};

export default MonthlySummaryChart;