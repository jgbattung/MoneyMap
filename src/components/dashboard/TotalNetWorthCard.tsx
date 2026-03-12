"use client"

import React, { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { useNetWorth } from '@/hooks/useNetWorth'
import { formatCurrency } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

const TotalNetWorthCard = () => {
  const { netWorth, monthlyChange, isLoading, error, refetch } = useNetWorth();
  const prefersReducedMotion = useReducedMotion();
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const springValue = useSpring(0, { duration: 800, bounce: 0 });
  const displayValue = useTransform(springValue, (v) => formatCurrency(v));
  const [animatedText, setAnimatedText] = useState('0.00');

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedText(formatCurrency(netWorth));
      return;
    }
    springValue.set(netWorth);
  }, [netWorth, prefersReducedMotion, springValue]);

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => setAnimatedText(v));
    return unsubscribe;
  }, [displayValue]);

  const isPositive = monthlyChange.amount > 0;
  const isNegative = monthlyChange.amount < 0;

  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : ArrowRight;
  const changePillClasses = isPositive
    ? 'bg-text-success/10 text-text-success'
    : isNegative
    ? 'bg-text-error/10 text-text-error'
    : 'bg-secondary-400/10 text-secondary-400';

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xl md:text-2xl font-semibold text-foreground tracking-tight'>Total Net Worth</h2>
          <Skeleton className="h-6 w-28 md:w-36 rounded-full bg-secondary-500" />
        </div>

        <div className='flex flex-col items-start'>
          <div className='flex items-end gap-2'>
            <span className='text-muted-foreground font-light text-sm md:text-base'>PHP</span>
            <Skeleton className="h-10 w-48 md:h-12 md:w-64 lg:h-14 lg:w-80 bg-secondary-500" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col items-center justify-center py-8 text-center gap-2'>
          <AlertCircle className="h-8 w-8 text-error-600" />
          <p className='text-error-600 font-semibold'>Failed to load net worth</p>
          <p className='text-muted-foreground text-sm'>{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className='cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1'
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Header with title and monthly change */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <h2 className='text-xl md:text-2xl font-semibold text-foreground tracking-tight'>Total Net Worth</h2>
          <button
            type="button"
            onClick={() => setIsBalanceHidden((prev) => !prev)}
            className='cursor-pointer p-1 rounded-md hover:bg-secondary-700 transition-colors text-muted-foreground'
            aria-label="Toggle balance visibility"
          >
            {isBalanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Monthly Change Pill Badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs md:text-sm font-medium ${changePillClasses}`}>
          <ChangeIcon className="h-3 w-3 md:h-4 md:w-4" />
          <span>
            {isBalanceHidden
              ? '***'
              : `₱${formatCurrency(Math.abs(monthlyChange.amount))} (${Math.abs(monthlyChange.percentage)}%)`
            }
          </span>
        </div>
      </div>

      {/* Main Net Worth Display */}
      <div className='flex flex-col items-start'>
        <div className='flex items-end gap-2'>
          <span className='text-muted-foreground font-light text-sm md:text-base'>PHP</span>
          <p className='text-foreground text-3xl md:text-4xl lg:text-5xl font-bold'>
            {isBalanceHidden ? '*****' : animatedText}
          </p>
        </div>
      </div>
    </div>
  );
};

export { TotalNetWorthCard };