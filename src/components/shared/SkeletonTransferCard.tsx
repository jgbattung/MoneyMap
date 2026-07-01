import { Skeleton } from '@/components/ui/skeleton'

export const SkeletonTransferCard = () => {
  return (
    <div className='money-map-card flex flex-col gap-3' role='status' aria-busy='true'>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-9 w-9 rounded-lg' />
        <Skeleton className='h-5 w-[160px]' />
      </div>
      <Skeleton className='h-3 w-[100px]' />
      <Skeleton className='h-3 w-[100px]' />
      <div className='flex flex-col items-end gap-1'>
        <Skeleton className='h-5 w-[80px]' />
        <Skeleton className='h-3 w-[120px]' />
      </div>
    </div>
  )
}
