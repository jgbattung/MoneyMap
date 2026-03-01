import { Skeleton } from '@/components/ui/skeleton'
import SkeletonAccountCard from '@/components/shared/SkeletonAccountCard'

export default function AccountsLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-36 bg-secondary-500' />
        <Skeleton className='h-9 w-32 bg-secondary-500 rounded-md' />
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonAccountCard key={i} />
        ))}
      </div>
    </div>
  )
}
