import { Skeleton } from '@/components/ui/skeleton'
import SkeletonBudgetCard from '@/components/shared/SkeletonBudgetCard'

export default function BudgetsLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-28 bg-secondary-500' />
        <Skeleton className='h-9 w-28 bg-secondary-500 rounded-md' />
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBudgetCard key={i} />
        ))}
      </div>
    </div>
  )
}
