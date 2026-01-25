"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { useAccountQuery } from '@/hooks/useAccountsQuery'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { capitalizeFirstLetter } from '@/lib/utils'
import ExpenseTable from '@/components/tables/expenses/ExpenseTable'
import IncomeTable from '@/components/tables/income/IncomeTable'
import TransferTable from '@/components/tables/transfers/TransferTable'
import TransactionsMobileView from '@/components/transactions/TransactionsMobileView'

const AccountDetailPage = () => {
  const params = useParams()
  const accountId = params.id as string
  const { data: accountData, isFetching, error } = useAccountQuery(accountId)

  // if (isFetching) {
  //   return (
  //     <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
  //       <div className="flex items-center justify-center py-16">
  //         <Icons.loader className="h-8 w-8 animate-spin text-primary" />
  //       </div>
  //     </div>
  //   )
  // }

  if (error || !accountData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl md:text-4xl font-semibold'>Failed to load account</p>
            <p className='text-muted-foreground'>{error || 'Account not found'}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-10"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const accountTypeFormatted = accountData.accountType
    .split('_')
    .map(word => capitalizeFirstLetter(word))
    .join(' ')

  const formattedBalance = parseFloat(accountData.currentBalance).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      {/* Account Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
            {accountData.name}
          </h1>
          {accountData.addToNetWorth && (
            <Icons.addToNetWorth size={20} className='text-accent-500' />
          )}
        </div>
        <p className="text-muted-foreground text-sm md:text-base">{accountTypeFormatted}</p>
        <div className="flex items-end gap-2 mt-2">
          <span className="text-muted-foreground font-light text-sm">PHP</span>
          <p className="text-foreground text-xl md:text-2xl font-semibold">{formattedBalance}</p>
        </div>
      </div>

      {/* Desktop View - Three Tables */}
      <div className="hidden md:block">
        <div className="space-y-8">
          {/* Expenses Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold md:text-2xl">Expenses</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Expense transactions for this account
              </p>
            </div>
            <ExpenseTable accountId={accountId} />
          </section>

          {/* Income Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold md:text-2xl">Income</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Income transactions for this account
              </p>
            </div>
            <IncomeTable accountId={accountId} />
          </section>

          {/* Transfers Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold md:text-2xl">Transfers</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Transfer transactions for this account
              </p>
            </div>
            <TransferTable accountId={accountId} />
          </section>
        </div>
      </div>

      {/* Mobile View - Tabs */}
      <div className="block md:hidden">
        <TransactionsMobileView accountId={accountId} />
      </div>
    </div>
  )
}

export default AccountDetailPage