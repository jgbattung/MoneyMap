"use client"

import React from 'react'
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Period } from '@/lib/net-worth-periods'

export interface PeriodOption {
  period: Period
  label: string
  available: boolean
  unlocksAt?: string
}

export interface PeriodDeltaValue {
  amount: number
  percentage: number
  sinceLabel: string
}

interface NetWorthPeriodDeltaProps {
  netWorth: number
  periods: PeriodOption[]
  selected: Period
  onSelect: (period: Period) => void
  delta: PeriodDeltaValue | null
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const NetWorthPeriodDelta = ({ netWorth, periods, selected, onSelect, delta }: NetWorthPeriodDeltaProps) => {
  const isPositive = (delta?.amount ?? 0) > 0
  const isNegative = (delta?.amount ?? 0) < 0

  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : ArrowRight
  const changeColor = isPositive
    ? 'text-text-success'
    : isNegative
    ? 'text-text-error'
    : 'text-secondary-400'

  return (
    <div className='flex flex-col gap-3'>
      {/* Header + period toggle */}
      <div className='flex items-center justify-between gap-2'>
        <p className='text-foreground font-light md:text-md lg:text-xl'>Total Net Worth</p>
        <ToggleGroup
          type='single'
          value={selected}
          onValueChange={(value) => value && onSelect(value as Period)}
          aria-label='Select comparison period'
          className='gap-1'
        >
          {periods.map((p) => (
            <ToggleGroupItem
              key={p.period}
              value={p.period}
              disabled={!p.available}
              title={p.available ? undefined : `Unlocks ${p.unlocksAt}`}
              className='h-7 rounded-md px-2 text-xs font-medium text-muted-foreground data-[state=on]:bg-primary/15 data-[state=on]:text-primary disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Headline net worth */}
      <div className='flex items-baseline gap-1'>
        <span className='text-muted-foreground font-light text-xs md:text-md'>₱</span>
        <p className='text-numeric text-foreground text-2xl md:text-3xl lg:text-4xl font-bold'>
          {formatCurrency(netWorth)}
        </p>
      </div>

      {/* Delta - peso-first, percentage secondary */}
      {delta && (
        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
          <span className={`flex items-center gap-1 ${changeColor}`}>
            <ChangeIcon className='h-3.5 w-3.5 md:h-4 md:w-4' />
            <span className='text-numeric font-semibold text-base md:text-lg'>
              {isPositive && '+'}
              {isNegative && '-'}₱{formatCurrency(Math.abs(delta.amount))}
            </span>
          </span>
          <span className='text-xs md:text-sm text-muted-foreground'>
            ({isPositive && '+'}
            {isNegative && '-'}
            {Math.abs(delta.percentage).toFixed(1)}%)
          </span>
          <span className='text-xs md:text-sm text-muted-foreground'>since {delta.sinceLabel}</span>
        </div>
      )}
    </div>
  )
}

export default NetWorthPeriodDelta
