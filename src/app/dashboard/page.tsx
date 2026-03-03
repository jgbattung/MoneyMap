"use client"

import React from 'react'
import NetWorthSection from '@/components/dashboard/NetWorthSection'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import AccountsSummary from '@/components/dashboard/AccountsSummary'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import BudgetStatus from '@/components/shared/BudgetStatus'
import { Icons } from '@/components/icons'

const Dashboard = () => {
  const router = useRouter();

  const handleLogout = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in")
        }
      }
    });
  };

  return (
    <div className='py-6 px-4 pb-20 md:pb-6 flex flex-col gap-4 mx-auto'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Dashboard</h1>
        
        <button 
          onClick={handleLogout}
          className="md:hidden p-2 hover:bg-white/10 rounded-md transition-colors"
          title="Logout"
        >
          <Icons.logOut size={24} />
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

      <AccountsSummary />
    </div>
  )
}

export default Dashboard