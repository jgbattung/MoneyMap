import { Skeleton } from '@/components/ui/skeleton'

export const SkeletonCompactTransactionCard = () => {
  return (
    <div className='bg-card border border-border rounded-lg p-3' role='status' aria-busy='true'>
      <div className='flex items-center gap-3'>
        <Skeleton className='h-8 w-8 rounded-md bg-secondary-500 flex-shrink-0' />
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2'>
            <Skeleton className='h-4 w-[100px] bg-secondary-500' />
            <Skeleton className='h-4 w-[60px] bg-secondary-500' />
          </div>
          <div className='flex items-center justify-between mt-1'>
            <Skeleton className='h-3 w-[80px] bg-secondary-500' />
            <Skeleton className='h-3 w-[40px] bg-secondary-500' />
          </div>
        </div>
      </div>
    </div>
  )
}
