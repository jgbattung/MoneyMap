"use client"

import TransferCard from '@/components/shared/TransferCard';
import TransferTypesList from '@/components/shared/TransferTypesList';
import TransferTable from '@/components/tables/transfers/TransferTable';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { useState } from 'react';

const Transactions = () => {
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const { transfers } = useTransfersQuery();
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">Transfers</h1>
      
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

        <div className="md:hidden space-y-4">
          {transfers?.map((transfer) => (
            <TransferCard
              key={transfer.id}
              id={transfer.id}
              name={transfer.name}
              amount={transfer.amount}
              date={transfer.date}
              fromAccount={transfer.fromAccount}
              toAccount={transfer.toAccount}
              transferType={transfer.transferType}
              onClick={() => setSelectedTransferId(transfer.id)}
            />
          ))}
        </div>

        <div className="hidden md:block">
          <TransferTable />
        </div>
      </div>
    </div>
  )
}

export default Transactions