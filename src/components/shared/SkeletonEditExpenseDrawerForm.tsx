import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer'

const SkeletonEditExpenseDrawerForm = () => {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className='text-xl'>Edit Expense Transaction</DrawerTitle>
        <DrawerDescription>
          Edit expense transaction.
        </DrawerDescription>
      </DrawerHeader>

      {/* Expense name field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Expense name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Amount field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Amount</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Account field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Account</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Expense type field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Expense type</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Date field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Date</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Description field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
        <Skeleton className='h-20 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Footer buttons */}
      <div className="flex flex-col p-4 gap-2">
        <Skeleton className='h-8 w-full bg-secondary-500' />
        <Skeleton className='h-8 w-full bg-secondary-500' />
      </div>
    </>
  )
}

export default SkeletonEditExpenseDrawerForm