import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonIncomeTypeCard = () => {
  return (
    <div className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-8 w-[35px] bg-secondary-500' />
        <Skeleton className='h-6 w-[180px] bg-secondary-500' />
      </div>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-4 w-[160px] bg-secondary-500' />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='flex justify-between'>
          <Skeleton className='h-4 w-[130px] bg-secondary-500' />
          <Skeleton className='h-4 w-[80px] bg-secondary-500' />
        </div>
      </div>
    </div>
  )
}

export default SkeletonIncomeTypeCard