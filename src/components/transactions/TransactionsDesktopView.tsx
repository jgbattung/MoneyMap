import React from 'react'
import ExpenseTable from '@/components/tables/expenses/ExpenseTable'
import IncomeTable from '@/components/tables/income/IncomeTable'
import TransferTable from '@/components/tables/transfers/TransferTable'

const TransactionsDesktopView = () => {
  return (
    <div className="space-y-8">
      {/* Expenses Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold md:text-2xl">Expenses</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage your expense transactions
          </p>
        </div>
        <ExpenseTable />
      </section>

      {/* Income Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold md:text-2xl">Income</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage your income transactions
          </p>
        </div>
        <IncomeTable />
      </section>

      {/* Transfers Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold md:text-2xl">Transfers</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage your transfer transactions
          </p>
        </div>
        <TransferTable />
      </section>
    </div>
  )
}

export default TransactionsDesktopView