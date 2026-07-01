import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonBudgetCard = () => {
  return (
    <div className='money-map-card flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-8 w-[35px]' />
        <Skeleton className='h-6 w-[190px]' />
      </div>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-4 w-[190px]' />
      </div>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-3 w-full' />
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-[120px]' />
          <Skeleton className='h-4 w-[60px]' />
        </div>
      </div>
    </div>
  )
}

export default SkeletonBudgetCard