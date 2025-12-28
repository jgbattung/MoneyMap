"use client"

import React from 'react'
import NetWorthSection from '@/components/dashboard/NetWorthSection'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import BudgetStatus from '@/components/shared/BudgetStatus'

const Dashboard = () => {
  const router = useRouter();

  return (
    <div className='py-6 px-4 flex flex-col gap-4 mx-auto'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Dashboard</h1>
        
        {/* Quick logout button for testing */}
        <button 
          onClick={() => signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push("/sign-in")
              }
            }
          })}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <NetWorthSection />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-secondary-800 border border-border rounded-lg p-4 md:p-6">
          <BudgetStatus />
        </div>

        <div className="lg:col-span-2 bg-secondary-800 border border-border rounded-lg p-4 md:p-6">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}

export default Dashboard