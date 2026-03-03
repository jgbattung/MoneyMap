import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonCardCard = () => {
  return (
    <div className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-6 w-[160px] bg-secondary-500' />
        <Skeleton className='h-4 w-[170px] bg-secondary-500' />
        <Skeleton className='h-4 w-[150px] bg-secondary-500' />
      </div>
      <div className='flex flex-col items-end gap-1'>
        <Skeleton className='h-6 w-[120px] bg-secondary-500' />
        <Skeleton className='h-4 w-[125px] bg-secondary-500' />
      </div>
    </div>
  )
}

export default SkeletonCardCard