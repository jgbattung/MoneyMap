"use client"

import React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Loader2 } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { useMonthlySummary } from '@/hooks/useMonthlySummary'

const chartConfig = {
  lastMonth: {
    label: "Last Month",
    color: "var(--chart-2)",
  },
  currentMonth: {
    label: "This Month",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

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
        <p className='text-foreground font-light text-sm md:text-base'>Monthly Summary</p>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-light text-sm md:text-base'>Monthly Summary</p>
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
        <p className='text-foreground font-light text-sm md:text-base'>Monthly Summary</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground text-sm'>No data available</p>
        </div>
      </div>
    );
  }

  // Prepare data for grouped bar chart
  const chartData = [
    {
      category: "Income",
      lastMonth: summary.lastMonth.income,
      currentMonth: summary.currentMonth.income,
    },
    {
      category: "Expenses",
      lastMonth: summary.lastMonth.expenses,
      currentMonth: summary.currentMonth.expenses,
    },
  ];

  // Calculate percentage changes
  const incomeChange = summary.lastMonth.income > 0
    ? ((summary.currentMonth.income - summary.lastMonth.income) / summary.lastMonth.income) * 100
    : 0;
  
  const expenseChange = summary.lastMonth.expenses > 0
    ? ((summary.currentMonth.expenses - summary.lastMonth.expenses) / summary.lastMonth.expenses) * 100
    : 0;

  const savingsColor = summary.currentMonth.savings >= 0 
    ? 'text-success-600' 
    : 'text-error-600';

  return (
    <div className='flex flex-col gap-4'>
      {/* Title */}
      <p className='text-foreground font-light text-sm md:text-base'>Monthly Summary</p>

      {/* Grouped Bar Chart */}
      <ChartContainer config={chartConfig} className="h-[180px] md:h-[200px] w-full">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatCurrency}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="lastMonth"
            fill="var(--color-lastMonth)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="currentMonth"
            fill="var(--color-currentMonth)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>

      {/* Percentage Changes */}
      <div className='grid grid-cols-2 gap-2 text-xs'>
        <div className='flex flex-col'>
          <span className='text-muted-foreground'>Income Change</span>
          <span className={incomeChange >= 0 ? 'text-success-600' : 'text-error-600'}>
            {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
          </span>
        </div>
        <div className='flex flex-col'>
          <span className='text-muted-foreground'>Expense Change</span>
          <span className={expenseChange <= 0 ? 'text-success-600' : 'text-error-600'}>
            {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Current Month Savings */}
      <div className='border-t border-border pt-3'>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground text-sm'>Net Savings This Month</span>
          <span className={`text-base font-semibold ${savingsColor}`}>
            {formatCurrency(summary.currentMonth.savings)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryChart;