import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className='py-6 px-4 pb-20 md:pb-6 flex flex-col gap-4 mx-auto'>
      {/* Header */}
      <Skeleton className='h-10 w-40 bg-secondary-500' />

      {/* NetWorthSection */}
      <div className='bg-secondary-800 border border-border rounded-lg p-4 md:p-6 flex flex-col gap-4'>
        <Skeleton className='h-4 w-20 bg-secondary-500' />
        <Skeleton className='h-10 w-52 bg-secondary-500' />
        <div className='grid grid-cols-3 gap-4'>
          <Skeleton className='h-16 bg-secondary-500 rounded-md' />
          <Skeleton className='h-16 bg-secondary-500 rounded-md' />
          <Skeleton className='h-16 bg-secondary-500 rounded-md' />
        </div>
      </div>

      {/* BudgetStatus + RecentTransactions */}
      <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
        <div className='lg:col-span-3 bg-secondary-800 border border-border rounded-lg p-4 md:p-6 flex flex-col gap-3'>
          <Skeleton className='h-5 w-28 bg-secondary-500' />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-full bg-secondary-500 rounded-md' />
          ))}
        </div>
        <div className='lg:col-span-2 bg-secondary-800 border border-border rounded-lg p-4 md:p-6 flex flex-col gap-3'>
          <Skeleton className='h-5 w-36 bg-secondary-500' />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-full bg-secondary-500 rounded-md' />
          ))}
        </div>
      </div>

      {/* AccountsSummary */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-24 bg-secondary-500 rounded-md' />
        ))}
      </div>
    </div>
  )
}
