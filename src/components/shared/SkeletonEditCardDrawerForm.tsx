import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer'

const SkeletonEditCardDrawerForm = () => {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className='text-xl'>Edit credit card</DrawerTitle>
        <DrawerDescription>
          Update your credit card details and information.
        </DrawerDescription>
      </DrawerHeader>

      {/* Account name field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Card name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Account type field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Outstanding balance</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-3/4 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Current balance field */}
      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Statement date</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-8/9 bg-secondary-500 mt-2' />
          <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
        </div>
      </div>

      {/* Initial balance field */}
      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Due date</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-3/4 bg-secondary-500 mt-2' />
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

export default SkeletonEditCardDrawerForm