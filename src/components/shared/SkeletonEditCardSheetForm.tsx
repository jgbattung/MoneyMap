import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const SkeletonEditCardSheetForm = () => {
  return (
    <>
      <SheetHeader>
        <SheetTitle className='text-2xl'>Edit credit card</SheetTitle>
        <SheetDescription>
          Update your credit card details and information.
        </SheetDescription>
      </SheetHeader>

      {/* Account name field */}
      <div className='p-3'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Card name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Account type field */}
      <div className="p-3">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Outstanding balance</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-3/7 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Current balance field */}
      <div className="p-3">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Statement due balance</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-4/7 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Initial balance field */}
      <div className='p-3'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Due date</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-3/7 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex flex-col p-4 gap-2">
        <Skeleton className='h-8 w-full bg-secondary-500' />
        <Skeleton className='h-8 w-full bg-secondary-500' />
      </div>
    </>
  )
}

export default SkeletonEditCardSheetForm