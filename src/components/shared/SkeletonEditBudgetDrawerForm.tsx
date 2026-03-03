import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer'

const SkeletonEditBudgetDrawerForm = () => {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className='text-xl'>Edit budget</DrawerTitle>
        <DrawerDescription>
          Update your budget details
        </DrawerDescription>
      </DrawerHeader>

      <div className='p-4'>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Budget name</label>
        <Skeleton className='h-8 w-full bg-secondary-500 mt-2' />
      </div>

      <div className="p-4">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Monthly budget</label>
        <div className='flex flex-col'>
          <Skeleton className='h-5 w-3/4 bg-secondary-500 mt-2' />
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

export default SkeletonEditBudgetDrawerForm