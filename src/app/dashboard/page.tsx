"use client"

import React from 'react'
import NetWorthSection from '@/components/dashboard/NetWorthSection'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const Dashboard = () => {
  const router = useRouter();

  return (
    <div className='py-6 px-4 flex flex-col gap-4 mx-auto'>
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

      {/* Recent Transactions Section */}
      <div className='bg-secondary-800 border border-border rounded-lg p-4 md:p-6'>
        <RecentTransactions />
      </div>
    </div>
  )
}

export default Dashboard