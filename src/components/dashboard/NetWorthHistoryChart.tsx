"use client"

import React, { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory'
import { EmptyState } from '@/components/shared/EmptyState'
import { TrendingUp } from 'lucide-react'

const chartConfig = {
  netWorth: {
    label: "Net Worth",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const RANGE_KEY = 'networth-history-range'
const RANGE_MONTHS = { '3M': 3, '6M': 6, '1Y': 12, All: Infinity } as const
type Range = keyof typeof RANGE_MONTHS
const RANGES = Object.keys(RANGE_MONTHS) as Range[]

const NetWorthHistoryChart = () => {
  const { history, isLoading, error } = useNetWorthHistory();

  const [range, setRange] = useState<Range>('1Y');

  useEffect(() => {
    const saved = localStorage.getItem(RANGE_KEY);
    if (saved && saved in RANGE_MONTHS) {
      setRange(saved as Range);
    }
  }, []);

  const handleRangeChange = (value: string) => {
    if (!value) return; // ignore deselection of the active item
    setRange(value as Range);
    localStorage.setItem(RANGE_KEY, value);
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between mt-6'>
          <h2 className='text-lg font-semibold text-foreground tracking-tight mt-6'>
            Net Worth Over Time
          </h2>
          <div className="h-3 w-20 md:h-4 md:w-24 bg-secondary-500 rounded animate-pulse" />
        </div>

        <div className="relative h-[200px] md:h-[250px] w-full bg-secondary-500/20 rounded animate-pulse overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="h-px bg-secondary-500/40" />
            <div className="h-px bg-secondary-500/40" />
            <div className="h-px bg-secondary-500/40" />
            <div className="h-px bg-secondary-500/40" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-secondary-500/30 to-transparent" />
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
        <EmptyState
          icon={TrendingUp}
          title="No history available"
          description="Net worth trends will appear over time."
          variant="widget"
        />
      </div>
    );
  }

  const months = RANGE_MONTHS[range];
  const displayed = months === Infinity ? history : history.slice(-months);
  const spansMultipleYears =
    new Set(displayed.map((d) => d.month.split(' ')[1])).size > 1;
  const formatXTick = (value: string) => {
    const [month, year] = value.split(' ');
    return spansMultipleYears ? `${month} '${year.slice(2)}` : month;
  };

  return (
    <div className='flex flex-col gap-3'>
      {/* Chart Title */}
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold text-foreground tracking-tight mt-6'>
          Net Worth Over Time
        </h2>
        <ToggleGroup
          type='single'
          value={range}
          onValueChange={handleRangeChange}
          aria-label='Select net worth time range'
          className='gap-1'
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              className='h-7 rounded-md px-2 text-xs font-medium text-muted-foreground data-[state=on]:bg-primary/15 data-[state=on]:text-primary'
            >
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] w-full">
        <AreaChart
          accessibilityLayer
          data={displayed}
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
            tickFormatter={formatXTick}
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