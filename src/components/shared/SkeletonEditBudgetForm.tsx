import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const SkeletonEditBudgetForm = () => {
  return (
    <>
      <SheetHeader>
        <SheetTitle className='text-2xl'>Edit budget</SheetTitle>
        <SheetDescription>
          Update your budget details
        </SheetDescription>
      </SheetHeader>

      <div className="p-4">
        <label className="flex flex-col text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Budget name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Monthly budget</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-4/7 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      <div className="flex flex-col p-4 gap-2">
        <Skeleton className='h-8 w-full bg-secondary-500' />
        <Skeleton className='h-8 w-full bg-secondary-500' />
      </div>
    </>
  )
}

export default SkeletonEditBudgetForm