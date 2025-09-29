"use client"

import TransferTypesList from '@/components/shared/TransferTypesList'
import React from 'react'

const Transactions = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">Transfers</h1>
      {/* Transfer Types Section */}
      <div className="my-3 md:my-6 lg:my-12">
        <div className="mb-6">
          <h2 className="text-lg font-semibold md:text-xl lg:text-2xl">
            Transfer Types
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Manage your transfer categories for organizing money movements between accounts.
          </p>
        </div>
        <TransferTypesList />
      </div>

      {/* Transactions Section - Placeholder for Phase 2 */}
      <div>
        <div className="my-3 md:my-6 lg:my-12">
          <h2 className="text-lg font-semibold md:text-xl lg:text-2xl">
            Transfer Transactions
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            View and manage your transfer history.
          </p>
        </div>
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          Transfer transactions coming in Phase 2
        </div>
      </div>
    </div>
  )
}

export default Transactions