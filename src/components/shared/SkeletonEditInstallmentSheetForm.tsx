import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'

const SkeletonEditInstallmentSheetForm = () => {
  return (
    <>
      <SheetHeader>
        <SheetTitle className='text-2xl'>Edit installment</SheetTitle>
        <SheetDescription>
          Update your installment details.
        </SheetDescription>
      </SheetHeader>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Total amount</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Account</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Duration</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Installment start date</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Expense type</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className="flex flex-col p-4 gap-2">
        <Skeleton className='h-8 w-full bg-secondary-500' />
        <Skeleton className='h-8 w-full bg-secondary-500' />
      </div>
    </>
  )
}

export default SkeletonEditInstallmentSheetForm
