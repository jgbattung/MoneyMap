import TransactionsDesktopView from '@/components/transactions/TransactionsDesktopView'
import React from 'react'

const Transactions = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold mb-6">
        Transactions
      </h1>

      {/* Mobile View - Placeholder */}
      <div className="block md:hidden">
        {/* TransactionsMobileView will go here */}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <TransactionsDesktopView />
      </div>
    </div>
  )
}

export default Transactions