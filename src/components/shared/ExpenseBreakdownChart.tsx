"use client"

import React from 'react'
import { Pie, PieChart, Cell } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpenseBreakdown } from '@/hooks/useExpenseBreakdown'

interface ExpenseBreakdownChartProps {
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
}

// Generate distinct colors programmatically using HSL color wheel distribution
const generateColor = (index: number, total: number): string => {
  // Distribute hues evenly across the color wheel (0-360 degrees)
  const hue = (index * 360) / total
  // Keep saturation and lightness consistent for visual harmony
  // 65% saturation for vibrant colors, 60% lightness works well with dark theme
  return `hsl(${hue}, 65%, 60%)`
}

const ExpenseBreakdownChart = ({ month, year, onMonthChange }: ExpenseBreakdownChartProps) => {
  const { breakdown, isLoading, error } = useExpenseBreakdown(month, year)

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  // Generate month options from earliest transaction to current month
  const generateMonthOptions = () => {
    const options: { label: string; month: number; year: number }[] = []
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // 1-indexed
    const currentYear = now.getFullYear()
    
    // Use earliest transaction date if available, otherwise default to January 2025
    const startYear = breakdown?.earliestYear ?? 2025
    const startMonth = breakdown?.earliestMonth ?? 1

    let iterYear = startYear
    let iterMonth = startMonth

    while (iterYear < currentYear || (iterYear === currentYear && iterMonth <= currentMonth)) {
      const date = new Date(iterYear, iterMonth - 1)
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ label, month: iterMonth, year: iterYear })

      // Move to next month
      iterMonth++
      if (iterMonth > 12) {
        iterMonth = 1
        iterYear++
      }
    }

    return options.reverse() // Most recent first
  }

  const monthOptions = generateMonthOptions()
  const selectedValue = `${year}-${month}`

  const handleMonthSelect = (value: string) => {
    const [selectedYear, selectedMonth] = value.split('-').map(Number)
    onMonthChange(selectedMonth, selectedYear)
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
      <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
        {/* Header skeleton */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <p className='text-foreground font-semibold text-sm md:text-base'>Expense Breakdown</p>
          <Skeleton className='h-9 w-full sm:w-[180px] bg-secondary-500' />
        </div>

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
      <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <p className='text-foreground font-semibold text-sm md:text-base'>Expense Breakdown</p>
          <Select value={selectedValue} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load expense breakdown</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    )
  }

  // Empty state - no expenses for this month
  if (!breakdown || breakdown.data.length === 0) {
    return (
      <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <p className='text-foreground font-semibold text-sm md:text-base'>Expense Breakdown</p>
          <Select value={selectedValue} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted-foreground'>No expenses recorded for this month.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
      {/* Header with title and month picker */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Expense Breakdown</p>
        <Select value={selectedValue} onValueChange={handleMonthSelect}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                    {formatCurrency(breakdown.totalSpent)}
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

      {/* Expense breakdown list */}
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

export default ExpenseBreakdownChart