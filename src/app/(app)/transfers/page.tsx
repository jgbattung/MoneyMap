"use client"

import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import TransferCard from '@/components/shared/TransferCard';
import TransferTypesList from '@/components/shared/TransferTypesList';
import { SkeletonTransferCard } from '@/components/shared/SkeletonTransferCard';
import TransferTable from '@/components/tables/transfers/TransferTable';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { Button } from '@/components/ui/button';
import { MobileFilterBar } from "@/components/transactions/filters/MobileFilterBar";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { useTransferFilterOptions } from "@/hooks/useTransactionFilterOptions";
import { SearchX } from 'lucide-react';
import { useState, useEffect } from 'react';

const ITEMS_PER_LOAD = 15;

const Transactions = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const filterState = useTransactionFilters();
  const { preset, filters, queryDates } = filterState;
  const filterOptions = useTransferFilterOptions();

  const { transfers, hasMore, isLoading, isFetchingMore, total } = useTransfersQuery({
    skip: 0,
    take: displayCount,
    search: debouncedSearchTerm,
    ...queryDates,
    filters,
  });
  
  const [selectedTransferId, setSelectedTransferId] = useState<string>('');
  const [editTransferDrawerOpen, setEditTransferDrawerOpen] = useState(false);

  // Debounce effect — 500ms delay, min 2 chars before firing (clears on empty)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD);
  }, [debouncedSearchTerm, preset, filters]);

  const handleTransferCardClick = (transferId: string) => {
    setSelectedTransferId(transferId);
    setEditTransferDrawerOpen(true);
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };


  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-0 pb-36 md:pb-6 flex flex-col">
      <PageHeader title="Transfers" />
      
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
          <MobileFilterBar
            kind="transfer"
            filterState={filterState}
            options={filterOptions}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search transfers..."
            isLoading={isLoading}
            isSearching={debouncedSearchTerm.length > 0}
            total={total}
          />

          {isLoading ? (
            <div className='grid grid-cols-1 gap-4'>
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonTransferCard key={index} />
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No transactions match your filters."
              description="Try adjusting your search or filters."
              variant="table"
            />
          ) : (
            <>
              {transfers.map((transfer) => (
                <TransferCard
                  key={transfer.id}
                  id={transfer.id}
                  name={transfer.name}
                  amount={transfer.amount}
                  date={transfer.date}
                  fromAccount={transfer.fromAccount}
                  toAccount={transfer.toAccount}
                  transferType={transfer.transferType}
                  tags={transfer.tags}
                  onClick={() => handleTransferCardClick(transfer.id)}
                />
              ))}
              
              {isFetchingMore && (
                <div className='grid grid-cols-1 gap-4 mt-4'>
                  {Array.from({ length: 3 }, (_, index) => (
                    <SkeletonTransferCard key={index} />
                  ))}
                </div>
              )}

              {hasMore && !isFetchingMore && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleLoadMore}
                >
                  Load More
                </Button>
              )}
            </>
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