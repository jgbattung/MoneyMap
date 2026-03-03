"use client"

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'
import { useNetWorth } from '@/hooks/useNetWorth'
import { useNetWorthTarget } from '@/hooks/useNetWorthTarget'
import SetTargetDialog from '../forms/SetTargetDialog'

const NetWorthCard = () => {
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);

  const { netWorth, monthlyChange, isLoading: isLoadingNetWorth, error: netWorthError } = useNetWorth();
  const { target, targetDate, isLoading: isLoadingTarget, error: targetError } = useNetWorthTarget();

  const isLoading = isLoadingNetWorth || isLoadingTarget;
  const error = netWorthError || targetError;

  const progressPercentage = target ? (netWorth / target) * 100 : 0;

  const isPositive = monthlyChange.amount > 0;
  const isNegative = monthlyChange.amount < 0;

  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : ArrowRight;
  const changeColor = isPositive 
    ? 'text-success-600' 
    : isNegative 
    ? 'text-error-600' 
    : 'text-secondary-400';

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatTargetDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className='flex flex-col max-w-5xl gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
        {/* Header Section Skeleton */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-5 w-32 md:h-6 md:w-36 bg-secondary-500' />
          <Skeleton className='h-8 w-24 rounded-md bg-secondary-500' />
        </div>

        {/* Main Net Worth Display Skeleton */}
        <div className='flex flex-col items-start gap-1'>
          <Skeleton className='h-3 w-10 bg-secondary-500' />
          <Skeleton className='h-10 w-48 md:h-12 md:w-64 bg-secondary-500' />
        </div>

        {/* Monthly Change Indicator Skeleton */}
        <Skeleton className='h-4 w-56 md:h-5 md:w-64 bg-secondary-500' />

        {/* Progress Section Skeleton */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Skeleton className='h-3 w-40 md:h-4 md:w-48 bg-secondary-500' />
            <Skeleton className='h-3 w-12 bg-secondary-500' />
          </div>
          <Skeleton className='h-2 w-full rounded-full bg-secondary-500' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col max-w-5xl gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load net worth</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-col max-w-5xl gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
        {/* Header Section */}
        <div className='flex items-center justify-between'>
          <p className='text-foreground font-light md:text-md lg:text-xl '>Total Net Worth</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTargetDialogOpen(true)}
            className='text-xs md:text-sm hover:text-white'
          >
            {target ? 'Edit target' : 'Set target'}
          </Button>
        </div>

        {/* Main Net Worth Display */}
        <div className='flex flex-col items-start'>
          <div className='flex items-end justify-center gap-2'>
            <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
            <p className='text-foreground text-2xl md:text-3xl lg:text-4xl font-bold'>{formatCurrency(netWorth)}</p>
          </div>
        </div>

        {/* Monthly Change Indicator */}
        <div className={`flex items-center justify-start gap-1 ${changeColor}`}>
          <ChangeIcon className="h-3 w-3 md:h-4 md:w-4" />
          <span className="text-xs md:text-sm font-medium gap-2">
            {isPositive && '+'}{isNegative && '-'}₱{formatCurrency(Math.abs(monthlyChange.amount))}
            {` (${Math.abs(monthlyChange.percentage)}%)`}
            <span className='text-muted-foreground'> from last month</span>
          </span>
        </div>

        {/* Progress Section - Only show if target is set */}
        {target && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">
                Target: ₱{formatCurrency(target)}
                {targetDate && ` by ${formatTargetDate(targetDate)}`}
              </span>
              <span className="font-medium text-foreground">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </div>

      {/* Set Target Dialog */}
      <SetTargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        currentTarget={target}
        currentTargetDate={targetDate}
      />
    </>
  )
}

export default NetWorthCard