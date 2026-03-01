import { Skeleton } from '@/components/ui/skeleton'
import SkeletonIncomeTypeCard from '@/components/shared/SkeletonIncomeTypeCard'

export default function ExpensesLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-32 bg-secondary-500' />
        <Skeleton className='h-9 w-32 bg-secondary-500 rounded-md' />
      </div>
      <div className='mt-10'>
        {/* Mobile: card list */}
        <div className='md:hidden grid grid-cols-1 gap-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonIncomeTypeCard key={i} />
          ))}
        </div>
        {/* Desktop: table skeleton */}
        <div className='hidden md:flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-9 w-72 bg-secondary-500 rounded-md' />
            <Skeleton className='h-9 w-48 bg-secondary-500 rounded-md' />
          </div>
          <Skeleton className='h-[400px] w-full bg-secondary-500 rounded-md' />
        </div>
      </div>
    </div>
  )
}
