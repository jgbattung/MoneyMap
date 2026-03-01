import { Skeleton } from '@/components/ui/skeleton'
import SkeletonIncomeTypeCard from '@/components/shared/SkeletonIncomeTypeCard'

export default function IncomeLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-28 bg-secondary-500' />
        <Skeleton className='h-9 w-40 bg-secondary-500 rounded-md' />
      </div>

      {/* Income Categories section */}
      <div className='my-3 md:my-6 lg:mt-12 lg:mb-6 flex flex-col gap-1'>
        <Skeleton className='h-6 w-44 bg-secondary-500' />
        <Skeleton className='h-4 w-72 bg-secondary-500 mt-2' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonIncomeTypeCard key={i} />
        ))}
      </div>

      {/* Income Transactions section */}
      <div className='my-3 md:my-6 lg:mt-12 lg:mb-6 flex flex-col gap-1'>
        <Skeleton className='h-6 w-48 bg-secondary-500' />
        <Skeleton className='h-4 w-64 bg-secondary-500 mt-2' />
      </div>
      {/* Mobile */}
      <div className='md:hidden grid grid-cols-1 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonIncomeTypeCard key={i} />
        ))}
      </div>
      {/* Desktop */}
      <div className='hidden md:flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-9 w-72 bg-secondary-500 rounded-md' />
          <Skeleton className='h-9 w-48 bg-secondary-500 rounded-md' />
        </div>
        <Skeleton className='h-[400px] w-full bg-secondary-500 rounded-md' />
      </div>
    </div>
  )
}
