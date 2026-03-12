"use client"

import React, { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { useNetWorth } from '@/hooks/useNetWorth'
import { formatCurrency } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

const TotalNetWorthCard = () => {
  const { netWorth, monthlyChange, isLoading, error } = useNetWorth();
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
          <p className='text-foreground font-light text-lg md:text-xl'>Total Net Worth</p>
          <Skeleton className="h-4 w-24 md:h-5 md:w-32 bg-secondary-500" />
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
        <div className='flex flex-col items-center justify-center py-8 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load net worth</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Header with title and monthly change */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <p className='text-foreground font-light text-lg md:text-xl'>Total Net Worth</p>
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

export default TotalNetWorthCard;