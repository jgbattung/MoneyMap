import { PageHeader } from '@/components/shared/PageHeader'
import TransactionsDesktopView from '@/components/transactions/TransactionsDesktopView'
import TransactionsMobileView from '@/components/transactions/TransactionsMobileView'
import React from 'react'

const Transactions = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-0 pb-24 md:pb-6 flex flex-col">
      <PageHeader title="Transactions" />

      <div className="block md:hidden">
        <TransactionsMobileView />
      </div>

      <div className="hidden md:block">
        <TransactionsDesktopView />
      </div>
    </div>
  )
}

export default Transactions