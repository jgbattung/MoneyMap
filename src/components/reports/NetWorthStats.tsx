"use client"

import React from 'react'
import type { PeriodStats } from '@/lib/net-worth-periods'

interface NetWorthStatsProps {
  stats: PeriodStats
  scopeLabel: string
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// Plain divs only — nested cards are an absolute design-system ban.
// Hierarchy comes from type alone: muted xs labels, values smaller than the headline.
const NetWorthStats = ({ stats, scopeLabel }: NetWorthStatsProps) => {
  const annualizedAverage = stats.average * 12;

  return (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
      <div title={`The highest cumulative net worth reached ${scopeLabel}`}>
        <p className='text-xs text-muted-foreground'>Highest ever · {scopeLabel}</p>
        <p className='text-numeric text-foreground text-lg md:text-xl font-semibold'>
          ₱{formatCurrency(stats.peak.value)}
        </p>
        <p className='text-xs text-muted-foreground'>{stats.peak.month}</p>
      </div>

      <div title={`The average monthly change ${scopeLabel}, annualized`}>
        <p className='text-xs text-muted-foreground'>Avg / month · {scopeLabel}</p>
        <p className='text-numeric text-foreground text-lg md:text-xl font-semibold'>
          {stats.average >= 0 ? '+' : '-'}₱{formatCurrency(Math.abs(stats.average))}
        </p>
        <p className='text-xs text-muted-foreground'>
          {annualizedAverage >= 0 ? '+' : '-'}₱{formatCurrency(Math.abs(annualizedAverage))}/yr annualized
        </p>
      </div>

      <div title={`How many of the last months ${scopeLabel} were positive, and the current trailing streak`}>
        <p className='text-xs text-muted-foreground'>Consistency · {scopeLabel}</p>
        <p className='text-numeric text-foreground text-lg md:text-xl font-semibold'>
          {stats.monthsUp} of {stats.monthsTotal} up
        </p>
        <p className='text-xs text-muted-foreground'>
          {stats.streak > 0 ? `${stats.streak}-month streak` : 'No current streak'}
        </p>
      </div>
    </div>
  )
}

export default NetWorthStats
