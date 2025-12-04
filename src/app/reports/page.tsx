import NetWorthCard from '@/components/shared/NetWorthCard'
import React from 'react'

const Reports = () => {
  return (
    <div className="h-dvh max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      {/* Page Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Reports</h1>
      </div>

      <div className='mt-10 space-y-6'>
        <div>
          <NetWorthCard />
        </div>
      </div>
    </div>
  )
}

export default Reports