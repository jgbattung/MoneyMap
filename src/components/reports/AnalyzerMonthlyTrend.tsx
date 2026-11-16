"use client"

import React from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useReducedMotion } from 'framer-motion'
import { CHART_DRAW_MS } from '@/lib/motion'
import type { TransactionAnalysisMonth } from '@/types/transaction-analysis'

interface AnalyzerMonthlyTrendProps {
  data: TransactionAnalysisMonth[]
  totalAmount: number
}

const chartConfig = {
  amount: {
    label: 'Amount',
  },
} satisfies ChartConfig

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Build from numeric parts: new Date("YYYY-MM") is UTC and can shift months locally.
const parseMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

const AnalyzerMonthlyTrend = ({ data, totalAmount }: AnalyzerMonthlyTrendProps) => {
  const prefersReducedMotion = !!useReducedMotion()

  if (data.length < 2) return null

  const sameYear = data.every((d) => d.month.slice(0, 4) === data[0].month.slice(0, 4))
  const chartData = data.map((d) => {
    const date = parseMonth(d.month)
    return {
      ...d,
      label: format(date, sameYear ? 'MMM' : 'MMM yy'),
      fullLabel: format(date, 'MMM yyyy'),
    }
  })
  const avg = totalAmount / data.length

  return (
    <div>
      <h3 className='text-sm font-semibold mb-3 mt-2'>Monthly Trend</h3>
      <ChartContainer config={chartConfig} className='h-[140px] md:h-[180px] w-full'>
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray='3 3' />
          <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_value, payload) => payload?.[0]?.payload?.fullLabel ?? _value}
                formatter={(value, _name, item) => {
                  const count = item?.payload?.count ?? 0
                  return (
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-numeric'>{formatCurrency(value as number)}</span>
                      <span className='text-muted-foreground'>
                        {count} {count === 1 ? 'transaction' : 'transactions'}
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <Bar
            dataKey='amount'
            fill='var(--chart-1)'
            radius={[2, 2, 0, 0]}
            maxBarSize={48}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={CHART_DRAW_MS}
            animationEasing='ease-out'
          />
          <ReferenceLine
            y={avg}
            stroke='var(--chart-2)'
            strokeDasharray='4 4'
            label={{
              value: `avg ${formatCurrency(avg)}`,
              position: 'insideTopRight',
              // Brass (chart-2) matches the teal bars' lightness and vanishes over them.
              fill: 'var(--foreground)',
              fontSize: 11,
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export default AnalyzerMonthlyTrend
