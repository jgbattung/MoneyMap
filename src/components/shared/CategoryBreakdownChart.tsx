"use client"

import React from 'react'
import { Pie, PieChart, Cell } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpenseBreakdown } from '@/hooks/useExpenseBreakdown'
import { useIncomeBreakdown } from '@/hooks/useIncomeBreakdown'

type BreakdownType = 'expense' | 'income'

interface CategoryBreakdownChartProps {
  type: BreakdownType
  month: number
  year: number
}

// Config per type for labels and messaging
const TYPE_CONFIG = {
  expense: {
    emptyMessage: 'No expenses recorded for this month.',
    errorMessage: 'Failed to load expense breakdown',
  },
  income: {
    emptyMessage: 'No income recorded for this month.',
    errorMessage: 'Failed to load income breakdown',
  },
} as const

// Generate distinct colors programmatically using HSL color wheel distribution
const generateColor = (index: number, total: number): string => {
  const hue = (index * 360) / total
  return `hsl(${hue}, 65%, 60%)`
}

const CategoryBreakdownChart = ({ type, month, year }: CategoryBreakdownChartProps) => {
  const expenseResult = useExpenseBreakdown(month, year)
  const incomeResult = useIncomeBreakdown(month, year)

  const config = TYPE_CONFIG[type]

  // Select the appropriate data based on type
  const activeResult = type === 'expense' ? expenseResult : incomeResult
  const { isLoading, error } = activeResult

  // Normalize the breakdown data shape
  const breakdown = activeResult.breakdown
    ? {
        data: activeResult.breakdown.data,
        total: type === 'expense'
          ? (activeResult.breakdown as { totalSpent: number }).totalSpent
          : (activeResult.breakdown as { totalEarned: number }).totalEarned,
        earliestMonth: activeResult.breakdown.earliestMonth,
        earliestYear: activeResult.breakdown.earliestYear,
      }
    : null

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  // Prepare chart data with programmatically generated colors
  const chartData = breakdown?.data.map((item, index) => ({
    name: item.name,
    value: item.amount,
    percentage: item.percentage,
    fill: generateColor(index, breakdown.data.length),
  })) || []

  // Chart config with programmatic colors
  const chartConfig = breakdown?.data.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: generateColor(index, breakdown.data.length),
    }
    return acc
  }, {} as ChartConfig) || {} satisfies ChartConfig

  if (isLoading) {
    return (
      <div className='flex flex-col gap-4'>
        {/* Chart skeleton */}
        <div className='flex items-center justify-center py-12'>
          <Skeleton className='h-[250px] w-[250px] rounded-full bg-secondary-500' />
        </div>

        {/* Legend skeleton */}
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-4 w-full bg-secondary-500' />
          <Skeleton className='h-4 w-full bg-secondary-500' />
          <Skeleton className='h-4 w-full bg-secondary-500' />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold'>{config.errorMessage}</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!breakdown || breakdown.data.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted-foreground'>{config.emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Chart */}
      <div>
        <ChartContainer config={chartConfig} className="h-[250px] md:h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name, item) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.payload.fill }}
                        />
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatCurrency(value as number)}</span>
                        <span>({item.payload.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              label={({
                cx,
                cy,
              }) => {
                return (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-foreground text-xl font-bold"
                  >
                    {formatCurrency(breakdown.total)}
                  </text>
                );
              }}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      {/* Legend - rendered outside chart for full layout control */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 min-md:place-items-center">
        {chartData.map((item, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-xs text-muted-foreground">
              {item.name} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Breakdown list */}
      <div className="flex flex-col">
        {chartData.map((item, index) => (
          <div
            key={`breakdown-${index}`}
            className={`flex items-center justify-between py-3 px-3 ${
              index < chartData.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded min-w-[40px] text-center text-primary-950"
                style={{ backgroundColor: item.fill }}
              >
                {Math.round(item.percentage)}%
              </span>
              <span className="text-sm text-foreground">{item.name}</span>
            </div>
            <span className="text-sm text-foreground">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoryBreakdownChart