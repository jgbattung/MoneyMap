"use client"

import React from 'react'
import NetWorthSection from '@/components/dashboard/NetWorthSection'

const Dashboard = () => {
  return (
    <div className='py-6 px-4 flex flex-col gap-4 mx-auto'>
      <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Dashboard</h1>

      <NetWorthSection />

    </div>
  )
}

export default Dashboard