"use client"

import React from 'react'
import { calculateAssetCategories } from '@/lib/utils'
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/format';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const AssetCategoriesChart = () => {
  const { accounts, isLoading, error, refetch } = useAccountsQuery();
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className='flex flex-col gap-4'>
        {/* Title */}
        <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>

        {/* Segmented Bar Skeleton */}
        <Skeleton className='h-4 w-full rounded-md bg-secondary-500' />

        {/* Labels Skeleton */}
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
          {[...Array(6)].map((_, index) => (
            <div key={index} className='flex items-start gap-2'>
              {/* Color Indicator Skeleton */}
              <Skeleton className='w-2 h-2 rounded-full flex-shrink-0 mt-1 bg-secondary-500' />
              
              {/* Name and Percentage Skeleton */}
              <div className='flex flex-col min-w-0 gap-2'>
                <Skeleton className='h-3 w-24 bg-secondary-500' />
                <Skeleton className='h-3 w-12 bg-secondary-500' />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <AlertCircle className='h-8 w-8 text-error-600 mx-auto mb-2' />
          <p className='text-error-600 font-semibold text-sm'>Failed to load categories</p>
          <p className='text-muted-foreground text-xs mt-1'>{error}</p>
          <button
            onClick={() => refetch()}
            className='cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-3'
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const categories = calculateAssetCategories(accounts);

  if (categories.length === 0) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground text-sm'>No asset categories</p>
          <p className='text-muted-foreground text-xs mt-1'>
            Add accounts to see your asset distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Title */}
      <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>

      {/* Segmented Bar */}
      <div className='flex w-full h-4 rounded-md overflow-hidden'>
        {categories.map((category, index) => (
          <Tooltip key={category.name}>
            <TooltipTrigger asChild>
              {prefersReducedMotion ? (
                <div
                  style={{
                    width: `${category.percentage}%`,
                    backgroundColor: category.color,
                  }}
                  className='cursor-pointer transition-opacity hover:opacity-80'
                />
              ) : (
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${category.percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
                  style={{ backgroundColor: category.color }}
                  className='cursor-pointer transition-opacity hover:opacity-80'
                />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {category.name}: ₱{formatCurrency(category.value)} ({category.percentage}%)
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Labels */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        {categories.map((category) => (
          <div key={category.name} className='flex items-start gap-2'>
            {/* Color Indicator */}
            <div
              className='w-2 h-2 rounded-full flex-shrink-0 mt-1'
              style={{ backgroundColor: category.color }}
            />
            
            {/* Name, Amount, and Percentage */}
            <div className='flex flex-col min-w-0 gap-1'>
              <p className='text-foreground text-xs font-medium truncate'>
                {category.name}
              </p>
              <p className='text-muted-foreground text-xs'>
                ₱{formatCurrency(category.value)}
              </p>
              <p className='text-muted-foreground text-xs'>
                {category.percentage}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { AssetCategoriesChart };