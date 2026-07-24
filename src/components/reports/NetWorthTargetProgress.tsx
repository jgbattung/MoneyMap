"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { TargetProjection } from '@/lib/net-worth-periods'

interface NetWorthTargetProgressProps {
  target: number | null
  targetDate: string | null
  netWorth: number
  projection: TargetProjection | null
  onEditTarget: () => void
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTargetDate = (date: string | null) => {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatProjectedDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

const NetWorthTargetProgress = ({
  target,
  targetDate,
  netWorth,
  projection,
  onEditTarget,
}: NetWorthTargetProgressProps) => {
  if (!target) {
    return (
      <div className='pt-2 border-t border-border flex items-center justify-between'>
        <p className='text-xs md:text-sm text-muted-foreground'>No target set</p>
        <Button
          variant='outline'
          size='sm'
          onClick={onEditTarget}
          className='text-xs md:text-sm hover:text-white'
        >
          Set target
        </Button>
      </div>
    )
  }

  const progressPercentage = (netWorth / target) * 100
  const remaining = Math.max(target - netWorth, 0)

  return (
    <div className='pt-2 border-t border-border space-y-2'>
      <div className='flex items-center justify-between text-xs md:text-sm'>
        <span className='text-muted-foreground'>
          Target: ₱{formatCurrency(target)}
          {targetDate && ` by ${formatTargetDate(targetDate)}`}
        </span>
        <Button
          variant='outline'
          size='sm'
          onClick={onEditTarget}
          className='text-xs h-7 px-2 hover:text-white'
        >
          Edit target
        </Button>
      </div>

      <Progress value={progressPercentage} className='h-2' />

      <div className='flex items-center justify-between text-xs md:text-sm'>
        <span className='text-muted-foreground'>₱{formatCurrency(remaining)} to go</span>
        <span className='font-medium text-foreground'>{progressPercentage.toFixed(1)}%</span>
      </div>

      {projection && (
        <p className='text-xs md:text-sm text-muted-foreground'>
          {projection.kind === 'met' && 'Target reached'}
          {projection.kind === 'not-on-pace' && 'Not on pace at the current trend'}
          {projection.kind === 'insufficient-data' && 'Not enough history to estimate'}
          {projection.kind === 'on-pace' && `Estimated: ${formatProjectedDate(projection.date)}`}
        </p>
      )}
    </div>
  )
}

export default NetWorthTargetProgress
