import { Skeleton } from '@/components/ui/skeleton'
import SkeletonCardCard from '@/components/shared/SkeletonCardCard'

export default function CardsLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-24 bg-secondary-500' />
        <Skeleton className='h-9 w-36 bg-secondary-500 rounded-md' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCardCard key={i} />
        ))}
      </div>
    </div>
  )
}
