import React from 'react'
import AssetCategoriesChart from './AssetCategoriesChart'
import MonthlySummaryChart from './MonthlySummaryChart'

const NetWorthInsights = () => {
  return (
    <div className='flex flex-col gap-6 bg-secondary-700 border border-border rounded-lg lg:rounded-r-lg lg:rounded-l-none p-4 md:p-6 h-full'>
      <AssetCategoriesChart />
      
      <div className='border-t border-border' />
      
      <MonthlySummaryChart />
    </div>
  )
}

export default NetWorthInsights