import React from 'react'
import TotalNetWorthCard from './TotalNetWorthCard'
import NetWorthHistoryChart from './NetWorthHistoryChart'

const NetWorthDisplay = () => {
  return (
    <div className='flex flex-col gap-4 bg-secondary-800 border border-border rounded-lg lg:rounded-l-lg lg:rounded-r-none p-4 md:p-6 h-full'>
      <TotalNetWorthCard />
      
      <NetWorthHistoryChart />
    </div>
  )
}

export default NetWorthDisplay