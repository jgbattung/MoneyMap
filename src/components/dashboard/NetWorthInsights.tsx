import React from 'react'
import AssetCategoriesChart from './AssetCategoriesChart'
import MonthlySummaryChart from './MonthlySummaryChart'

const NetWorthInsights = () => {
  return (
    <div className='flex flex-col gap-4 bg-card border border-border rounded-lg p-4 md:p-6 h-full'>
      {/* Top: Asset Categories horizontal bar chart */}
      <AssetCategoriesChart />
      
      {/* Bottom: Monthly Summary grouped bar chart */}
      <MonthlySummaryChart />
    </div>
  )
}

export default NetWorthInsights