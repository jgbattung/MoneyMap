import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonAccountCard = () => {
  return (
    <div className='money-map-card flex flex-col gap-3'>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-6 w-[140px]' />
        <Skeleton className='h-7 w-[75px] rounded-2xl' />
      </div>
      <div className='flex flex-col items-end gap-1'>
        <Skeleton className='h-6 w-[120px]' />
        <Skeleton className='h-4 w-[60px]' />
      </div>
    </div>
  )
}

export default SkeletonAccountCard