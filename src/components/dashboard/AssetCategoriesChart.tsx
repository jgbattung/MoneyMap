"use client"

import React from 'react'
import { Loader2 } from 'lucide-react'
import { calculateAssetCategories } from '@/lib/utils'
import { useAccountsQuery } from '@/hooks/useAccountsQuery';

const AssetCategoriesChart = () => {
  const { accounts, isLoading, error } = useAccountsQuery();

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Asset Categories</p>
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-error-600 font-semibold text-sm'>Failed to load categories</p>
          <p className='text-muted-foreground text-xs mt-1'>{error}</p>
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
          <div
            key={category.name}
            style={{
              width: `${category.percentage}%`,
              backgroundColor: category.color,
            }}
            className='transition-opacity hover:opacity-80'
            title={`${category.name}: ${category.percentage}%`}
          />
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
            
            {/* Name and Percentage */}
            <div className='flex flex-col min-w-0 gap-2'>
              <p className='text-foreground text-xs font-medium truncate'>
                {category.name}
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

export default AssetCategoriesChart;