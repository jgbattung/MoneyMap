"use client"

import React from 'react'
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react'
import { useNetWorth } from '@/hooks/useNetWorth'
import { Skeleton } from '@/components/ui/skeleton'

const TotalNetWorthCard = () => {
  const { netWorth, monthlyChange, isLoading, error } = useNetWorth();

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
        <p className='text-foreground font-light text-lg md:text-xl'>Total Net Worth</p>
        
        {/* Monthly Change Indicator */}
        <div className={`flex items-center gap-1 ${changeColor}`}>
          <ChangeIcon className="h-3 w-3 md:h-4 md:w-4" />
          <span className="text-xs md:text-sm font-medium">
            {isPositive && '+'}{isNegative && '-'}₱{formatCurrency(Math.abs(monthlyChange.amount))}
            {` (${Math.abs(monthlyChange.percentage)}%)`}
          </span>
        </div>
      </div>

      {/* Main Net Worth Display */}
      <div className='flex flex-col items-start'>
        <div className='flex items-end gap-2'>
          <span className='text-muted-foreground font-light text-sm md:text-base'>PHP</span>
          <p className='text-foreground text-3xl md:text-4xl lg:text-5xl font-bold'>
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotalNetWorthCard;