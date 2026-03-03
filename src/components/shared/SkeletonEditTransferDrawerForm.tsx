import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer'

const SkeletonEditTransferDrawerForm = () => {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className='text-xl'>Edit Transfer Transaction</DrawerTitle>
        <DrawerDescription>
          Update your transfer transaction details.
        </DrawerDescription>
      </DrawerHeader>

      {/* Transfer name field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Transfer name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Amount field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Amount</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* From and To accounts side by side */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">From Account</label>
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
        <Skeleton className='h-5 w-5 bg-secondary-500 mt-8 flex-shrink-0' />
        <div className="flex-1">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">To Account</label>
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Transfer type field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Transfer type</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Date field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Date</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Notes field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Notes</label>
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

export default SkeletonEditTransferDrawerForm