"use client"

import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useReducedMotion } from 'framer-motion'
import { CHART_DRAW_MS } from '@/lib/motion'

export interface MonthlyBarDatum {
  month: string
  change: number
}

interface NetWorthMonthlyBarsProps {
  data: MonthlyBarDatum[]
}

const chartConfig = {
  change: {
    label: 'Monthly change',
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const NetWorthMonthlyBars = ({ data }: NetWorthMonthlyBarsProps) => {
  const prefersReducedMotion = !!useReducedMotion()

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-xs md:text-sm font-medium text-muted-foreground'>Monthly change</p>
      <ChartContainer config={chartConfig} className='h-[120px] md:h-[160px] w-full'>
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray='3 3' />
          <XAxis dataKey='month' tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide />
          <ReferenceLine y={0} stroke='var(--border)' strokeWidth={1} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => value}
                formatter={(value) => formatCurrency(value as number)}
              />
            }
          />
          <Bar
            dataKey='change'
            radius={[2, 2, 2, 2]}
            maxBarSize={48}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={CHART_DRAW_MS}
            animationEasing='ease-out'
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.change >= 0 ? 'var(--text-success)' : 'var(--text-error)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export default NetWorthMonthlyBars
