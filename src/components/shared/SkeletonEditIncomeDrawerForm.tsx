import React from 'react'
import { DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer'
import { Skeleton } from '../ui/skeleton'
import { ScrollArea } from '../ui/scroll-area'

const SkeletonEditIncomeDrawerForm = () => {
  return (
    <div className='flex flex-col h-full max-h-[85dvh]'>
      <DrawerHeader className='flex-shrink-0'>
        <DrawerTitle className='text-xl'>
          Edit Income Transaction
        </DrawerTitle>
        <DrawerDescription>
          Edit income transaction.
        </DrawerDescription>
      </DrawerHeader>

      <ScrollArea className="flex-1 min-h-0 scrollbar-hide">
        {/* Income name field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>

        {/* Amount field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-16 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>

        {/* Account field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-16 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>

        {/* Income type field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>

        {/* Date field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-12 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted" />
        </div>

        {/* Description field */}
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-20 bg-muted" />
          <Skeleton className="h-24 w-full bg-muted" />
        </div>
      </ScrollArea>

      <DrawerFooter className='flex-shrink-0'>
        <Skeleton className="h-10 w-full bg-muted" />
        <Skeleton className="h-10 w-full bg-muted" />
      </DrawerFooter>
    </div>
  )
}

export default SkeletonEditIncomeDrawerForm