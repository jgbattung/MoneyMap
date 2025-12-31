import NetWorthCard from '@/components/shared/NetWorthCard'
import React from 'react'

const Reports = () => {
  return (
    <div className="max-w-7xl px-4 py-6 pb-20 md:pb-6 flex flex-col">
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