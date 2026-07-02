import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonCardCard = () => {
  return (
    <div className='money-map-card flex flex-col gap-3'>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-6 w-[160px]' />
        <Skeleton className='h-4 w-[170px]' />
        <Skeleton className='h-4 w-[150px]' />
      </div>
      <div className='flex flex-col items-end gap-1'>
        <Skeleton className='h-6 w-[120px]' />
        <Skeleton className='h-4 w-[125px]' />
      </div>
    </div>
  )
}

export default SkeletonCardCard