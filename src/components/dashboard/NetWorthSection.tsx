import React from 'react'
import NetWorthDisplay from './NetWorthDisplay'
import NetWorthInsights from './NetWorthInsights'

const NetWorthSection = () => {
  return (
    <section className='w-full'>
      <div className='grid grid-cols-1 lg:grid-cols-5'>
        <div className='lg:col-span-3'>
          <NetWorthDisplay />
        </div>

        <div className='lg:col-span-2'>
          <NetWorthInsights />
        </div>
      </div>
    </section>
  )
}

export default NetWorthSection