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
import { Skeleton } from '@/components/ui/skeleton'

const AccountDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      {/* Header Skeleton */}
      <div className="mb-6 md:mb-8">
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-border rounded-lg md:rounded-xl p-4 md:p-8">
          {/* Mobile skeleton */}
          <div className="flex md:hidden flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg bg-secondary-500" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-32 bg-secondary-500" />
                  <Skeleton className="h-3 w-24 bg-secondary-500" />
                </div>
              </div>
            </div>
            <div className="pt-1 border-t border-border/50">
              <Skeleton className="h-8 w-36 bg-secondary-500" />
            </div>
          </div>

          {/* Desktop skeleton */}
          <div className="hidden md:flex md:items-center md:justify-between gap-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg bg-secondary-500" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-secondary-500" />
                <Skeleton className="h-4 w-32 bg-secondary-500" />
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex flex-col items-end space-y-2">
              <Skeleton className="h-4 w-24 bg-secondary-500" />
              <Skeleton className="h-10 w-40 bg-secondary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tables Skeleton - Desktop */}
      <div className="hidden md:block space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="mb-4">
              <Skeleton className="h-7 w-32 mb-2 bg-secondary-500" />
              <Skeleton className="h-4 w-64 bg-secondary-500" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-lg bg-secondary-500" />
          </div>
        ))}
      </div>

      {/* Mobile Skeleton */}
      <div className="block md:hidden space-y-4">
        <Skeleton className="h-10 w-full rounded-lg bg-secondary-500" />
        <Skeleton className="h-8 w-full rounded-lg bg-secondary-500" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg bg-secondary-500" />
          ))}
        </div>
      </div>
    </div>
  )
}

const AccountDetailPage = () => {
  const params = useParams()
  const accountId = params.id as string
  const { data: accountData, isFetching, error } = useAccountQuery(accountId)

  if (isFetching) {
    return <AccountDetailSkeleton />
  }

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
      <div className="mb-6 md:mb-8">
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-border rounded-lg md:rounded-xl p-4 md:p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex md:hidden flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icons.bank size={18} className='text-primary' />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg font-bold text-foreground">
                      {accountData.name}
                    </h1>
                    {accountData.addToNetWorth && (
                      <Icons.addToNetWorth size={12} className='text-accent-500' />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {accountTypeFormatted}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-baseline gap-1.5 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">PHP</span>
              <p className="text-2xl font-bold text-foreground">
                {formattedBalance}
              </p>
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:justify-between gap-6">
            {/* Left side - Account Info */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                <Icons.bank size={24} className='text-primary' />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                    {accountData.name}
                  </h1>
                  {accountData.addToNetWorth && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent-500/10 rounded-md">
                      <Icons.addToNetWorth size={14} className='text-accent-500' />
                    </div>
                  )}
                </div>
                <p className="text-base text-muted-foreground font-medium">
                  {accountTypeFormatted}
                </p>
              </div>
            </div>
            
            {/* Right side - Balance */}
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Current Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-base text-muted-foreground font-light">PHP</span>
                <p className="text-4xl font-bold text-foreground">
                  {formattedBalance}
                </p>
              </div>
            </div>
          </div>
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