"use client"

import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import TransferCard from '@/components/shared/TransferCard';
import TransferTypesList from '@/components/shared/TransferTypesList';
import TransferTable from '@/components/tables/transfers/TransferTable';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const ITEMS_PER_LOAD = 15;

const Transactions = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const { transfers, hasMore } = useTransfersQuery(0, displayCount);
  const [selectedTransferId, setSelectedTransferId] = useState<string>('');
  const [editTransferDrawerOpen, setEditTransferDrawerOpen] = useState(false);
  
  const handleTransferCardClick = (transferId: string) => {
    setSelectedTransferId(transferId);
    setEditTransferDrawerOpen(true);
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">Transfers</h1>
      
      <div className="my-3 md:my-6 lg:my-8">
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

      <div>
        <div className="my-3 md:my-6 lg:my-8">
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
              onClick={() => handleTransferCardClick(transfer.id)}
            />
          ))}
          
          {hasMore && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleLoadMore}
            >
              Load More
            </Button>
          )}
        </div>

        <div className="hidden md:block">
          <TransferTable />
        </div>
      </div>

      <EditTransferDrawer
        open={editTransferDrawerOpen}
        onOpenChange={setEditTransferDrawerOpen}
        className='block md:hidden'
        transferId={selectedTransferId}
      />
    </div>
  )
}

export default Transactions