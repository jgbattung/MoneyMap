"use client"

import React from 'react'
import NetWorthSection from '@/components/dashboard/NetWorthSection'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { AccountsSummary } from '@/components/dashboard/AccountsSummary'
import { MobileHeroSummary } from '@/components/dashboard/MobileHeroSummary'
import { BudgetStatus } from '@/components/shared/BudgetStatus'
import { PageHeader } from '@/components/shared/PageHeader'

const Dashboard = () => {
  return (
    <div className='pt-0 px-4 md:px-6 pb-20 md:pb-6 flex flex-col gap-6 mx-auto'>
      <PageHeader title="Dashboard" />
      <MobileHeroSummary />

      <NetWorthSection />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 money-map-card">
          <BudgetStatus />
        </div>

        <div className="lg:col-span-2 money-map-card">
          <RecentTransactions />
        </div>
      </div>

      <AccountsSummary />
    </div>
  )
}

export default Dashboard
