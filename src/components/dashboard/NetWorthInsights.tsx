import React from 'react'
import AssetCategoriesChart from './AssetCategoriesChart'
import MonthlySummaryChart from './MonthlySummaryChart'

const NetWorthInsights = () => {
  return (
    <div className='flex flex-col gap-6 bg-card border border-border rounded-lg p-4 md:p-6 h-full'>
      <AssetCategoriesChart />
      
      <div className='border-t border-border' />
      
      <MonthlySummaryChart />
    </div>
  )
}

export default NetWorthInsights