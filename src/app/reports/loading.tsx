import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsLoading() {
  return (
    <div className='max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col'>
      {/* Header */}
      <Skeleton className='h-10 w-32 bg-secondary-500' />

      <div className='mt-10 space-y-6'>
        {/* NetWorthCard */}
        <Skeleton className='h-32 w-full bg-secondary-500 rounded-lg' />

        {/* CategoryBreakdown card */}
        <div className='flex flex-col max-w-5xl gap-4 bg-card border border-border rounded-md p-4 shadow-md'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <Skeleton className='h-5 w-44 bg-secondary-500' />
            <Skeleton className='h-9 w-44 bg-secondary-500 rounded-md' />
          </div>
          <Skeleton className='h-8 w-full bg-secondary-500 rounded-md' />
          <Skeleton className='h-[300px] w-full bg-secondary-500 rounded-md' />
        </div>

        {/* AnnualSummaryTable */}
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-6 w-36 bg-secondary-500' />
          <Skeleton className='h-[300px] w-full bg-secondary-500 rounded-md' />
        </div>
      </div>
    </div>
  )
}
