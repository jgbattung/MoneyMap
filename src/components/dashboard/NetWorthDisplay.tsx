import React from 'react'
import TotalNetWorthCard from './TotalNetWorthCard'
import NetWorthHistoryChart from './NetWorthHistoryChart'

const NetWorthDisplay = () => {
  return (
    <div className='flex flex-col gap-4 bg-secondary-950 border border-border rounded-lg p-4 md:p-6 h-full'>
      <TotalNetWorthCard />
      
      <NetWorthHistoryChart />
    </div>
  )
}

export default NetWorthDisplay