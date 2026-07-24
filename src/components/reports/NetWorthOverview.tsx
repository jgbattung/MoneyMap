"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useNetWorth } from '@/hooks/useNetWorth'
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory'
import { useNetWorthTarget } from '@/hooks/useNetWorthTarget'
import SetTargetDialog from '@/components/forms/SetTargetDialog'
import NetWorthPeriodDelta, { type PeriodOption } from './NetWorthPeriodDelta'
import NetWorthMonthlyBars from './NetWorthMonthlyBars'
import NetWorthStats from './NetWorthStats'
import NetWorthTargetProgress from './NetWorthTargetProgress'
import {
  resolvePeriodBounds,
  computePeriodDelta,
  computeMonthlyChanges,
  computeStats,
  projectTargetDate,
  type HistoryPoint,
  type Period,
} from '@/lib/net-worth-periods'

const PERIOD_KEY = 'networth-overview-period'

const PERIOD_DEFS: { period: Period; label: string }[] = [
  { period: '1M', label: '1M' },
  { period: '3M', label: '3M' },
  { period: 'YEAR', label: 'This year' },
  { period: '1Y', label: '1Y' },
]

const SCOPE_LABELS: Record<Period, string> = {
  '1M': 'last month',
  '3M': 'last 3M',
  YEAR: 'this year',
  '1Y': 'last year',
}

const MONTHS_BACK: Record<Exclude<Period, 'YEAR'>, number> = {
  '1M': 1,
  '3M': 3,
  '1Y': 12,
}

// Computes the calendar month a currently-unavailable period will self-activate,
// so the copy stays accurate as more months of history accumulate.
function computeUnlockLabel(period: Period, history: HistoryPoint[], now: Date): string {
  if (period === 'YEAR') {
    const nextJan = new Date(now.getFullYear() + 1, 0, 1)
    return nextJan.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  const monthsBack = MONTHS_BACK[period]
  const monthsUntilUnlock = Math.max(monthsBack + 1 - history.length, 1)
  const unlockDate = new Date(now.getFullYear(), now.getMonth() + monthsUntilUnlock, 1)
  return unlockDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const NetWorthOverview = () => {
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('3M')

  const { netWorth, isLoading: isLoadingNetWorth, error: netWorthError } = useNetWorth()
  const { history, isLoading: isLoadingHistory, error: historyError } = useNetWorthHistory()
  const { target, targetDate, isLoading: isLoadingTarget, error: targetError } = useNetWorthTarget()

  useEffect(() => {
    const saved = localStorage.getItem(PERIOD_KEY)
    if (saved && PERIOD_DEFS.some((p) => p.period === saved)) {
      setSelectedPeriod(saved as Period)
    }
  }, [])

  const handleSelectPeriod = (period: Period) => {
    setSelectedPeriod(period)
    localStorage.setItem(PERIOD_KEY, period)
  }

  const now = useMemo(() => new Date(), [])

  const periods: PeriodOption[] = PERIOD_DEFS.map(({ period, label }) => {
    const bounds = resolvePeriodBounds(period, history, now)
    return bounds
      ? { period, label, available: true }
      : { period, label, available: false, unlocksAt: computeUnlockLabel(period, history, now) }
  })

  const selectedBounds = resolvePeriodBounds(selectedPeriod, history, now)

  const delta = selectedBounds
    ? {
        ...computePeriodDelta(history, selectedBounds, netWorth),
        sinceLabel: history[selectedBounds.startIndex].month,
      }
    : null

  const monthlyChanges = selectedBounds ? computeMonthlyChanges(history, selectedBounds) : []
  const stats = selectedBounds ? computeStats(monthlyChanges, history, selectedBounds) : null
  const projection = target ? projectTargetDate(monthlyChanges, netWorth, target) : null

  const isLoading = isLoadingNetWorth || isLoadingHistory || isLoadingTarget
  const error = netWorthError || historyError || targetError

  if (isLoading) {
    return (
      <div className='money-map-card flex flex-col max-w-5xl gap-3'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-5 w-32 md:h-6 md:w-36' />
          <Skeleton className='h-8 w-40 rounded-md' />
        </div>
        <div className='flex flex-col items-start gap-1'>
          <Skeleton className='h-3 w-10' />
          <Skeleton className='h-10 w-48 md:h-12 md:w-64' />
        </div>
        <Skeleton className='h-4 w-56 md:h-5 md:w-64' />
        <div className='pt-2 border-t border-border'>
          <Skeleton className='h-[120px] md:h-[160px] w-full' />
        </div>
        <div className='pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
        <div className='space-y-2 pt-2 border-t border-border'>
          <Skeleton className='h-3 w-48' />
          <Skeleton className='h-2 w-full rounded-full' />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='money-map-card flex flex-col max-w-5xl gap-3'>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load net worth</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='money-map-card flex flex-col max-w-5xl gap-3'>
        <NetWorthPeriodDelta
          netWorth={netWorth}
          periods={periods}
          selected={selectedPeriod}
          onSelect={handleSelectPeriod}
          delta={delta}
        />

        <div className='pt-2 border-t border-border'>
          <NetWorthMonthlyBars data={monthlyChanges} />
        </div>

        {stats && (
          <div className='pt-2 border-t border-border'>
            <NetWorthStats stats={stats} scopeLabel={SCOPE_LABELS[selectedPeriod]} />
          </div>
        )}

        <NetWorthTargetProgress
          target={target}
          targetDate={targetDate}
          netWorth={netWorth}
          projection={projection}
          onEditTarget={() => setTargetDialogOpen(true)}
        />
      </div>

      <SetTargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        currentTarget={target}
        currentTargetDate={targetDate}
      />
    </>
  )
}

export default NetWorthOverview
