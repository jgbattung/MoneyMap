"use client"

import React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Loader2 } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory'

const chartConfig = {
  netWorth: {
    label: "Net Worth",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const NetWorthHistoryChart = () => {
  const { history, isLoading, error } = useNetWorthHistory();

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-center py-16'>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load net worth history</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted-foreground'>No net worth history available</p>
          <p className='text-muted-foreground text-sm mt-2'>
            Start adding transactions to see your net worth trends
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Chart Title */}
      <div className='flex items-center justify-between'>
        <p className='text-foreground font-light text-sm md:text-base'>
          Net Worth Over Time
        </p>
        <p className='text-muted-foreground text-xs md:text-sm'>
          Last 12 Months
        </p>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] w-full">
        <AreaChart
          accessibilityLayer
          data={history}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.slice(0, 3)}
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
                labelFormatter={(value) => value}
                formatter={(value) => formatCurrency(value as number)}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--color-netWorth)"
            fill="var(--color-netWorth)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};

export default NetWorthHistoryChart;