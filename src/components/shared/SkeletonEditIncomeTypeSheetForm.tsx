import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const SkeletonEditIncomeTypeSheetForm = () => {
  return (
    <>
      <SheetHeader>
        <SheetTitle className='text-2xl'>Edit income type</SheetTitle>
        <SheetDescription>
          Update your income type details
        </SheetDescription>
      </SheetHeader>

      {/* Income type name field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Income type name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Monthly target field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Monthly target</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-4/7 bg-secondary-500 mt-2' />
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

export default SkeletonEditIncomeTypeSheetForm