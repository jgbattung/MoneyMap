import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer'

const SkeletonEditAccountDrawerForm = () => {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className='text-2xl'>Edit account</DrawerTitle>
        <DrawerDescription>
          Update your account details and information.
        </DrawerDescription>
      </DrawerHeader>

      {/* Account name field */}
      <div className='p-3'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Account name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Account type field */}
      <div className="p-3">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Account type</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Current balance field */}
      <div className="p-3">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Current balance</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Initial balance field */}
      <div className='p-3'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Initial balance</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      {/* Add to net worth checkbox */}
      <div className="p-3 flex flex-row items-start space-x-3 space-y-0">
        <Skeleton className='h-4 w-4 bg-secondary-500 mt-1' />
        <div className="space-y-1 leading-none flex-1 flex flex-col gap-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Include in net worth calculation</label>
          <Skeleton className='h-4 w-3/4 bg-secondary-500' />
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

export default SkeletonEditAccountDrawerForm