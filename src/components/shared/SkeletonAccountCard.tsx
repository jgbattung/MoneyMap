import React from 'react'
import { Skeleton } from '../ui/skeleton'

const SkeletonAccountCard = () => {
  return (
    <div className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
      <div className='flex flex-col gap-1'>
        <Skeleton className='h-6 w-[140px] bg-muted' />
        <Skeleton className='h-7 w-[75px] rounded-2xl bg-muted' />
      </div>
      <div className='flex flex-col items-end gap-1'>
        <Skeleton className='h-6 w-[120px] bg-muted' />
        <Skeleton className='h-4 w-[60px] bg-muted' />
      </div>
    </div>
  )
}

export default SkeletonAccountCard