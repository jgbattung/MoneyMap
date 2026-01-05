"use client"

import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import TransferCard from '@/components/shared/TransferCard';
import TransferTypesList from '@/components/shared/TransferTypesList';
import TransferTable from '@/components/tables/transfers/TransferTable';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchIcon } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const ITEMS_PER_LOAD = 15;

const dateFilterOptions = {
  viewAll: "view-all",
  thisMonth: "this-month",
  thisYear: "this-year",
};

const Transactions = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const { transfers, hasMore } = useTransfersQuery(0, displayCount);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(dateFilterOptions.viewAll);
  
  const [selectedTransferId, setSelectedTransferId] = useState<string>('');
  const [editTransferDrawerOpen, setEditTransferDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      if (dateFilter !== dateFilterOptions.viewAll) {
        const transferDate = new Date(transfer.date);
        const now = new Date();

        if (dateFilter === dateFilterOptions.thisMonth) {
          if (transferDate.getMonth() !== now.getMonth() || 
              transferDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === dateFilterOptions.thisYear) {
          if (transferDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!debouncedSearchTerm) return true;
      
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        transfer.name.toLowerCase().includes(searchLower) ||
        transfer.notes?.toLowerCase().includes(searchLower) ||
        transfer.fromAccount.name.toLowerCase().includes(searchLower) ||
        transfer.toAccount.name.toLowerCase().includes(searchLower) ||
        transfer.transferType.name.toLowerCase().includes(searchLower)
      );
    });
  }, [transfers, dateFilter, debouncedSearchTerm]);
  
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
          <InputGroup>
            <InputGroupInput 
              placeholder="Search transfers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          <ToggleGroup
            type="single"
            value={dateFilter}
            variant="outline"
            size="sm"
            onValueChange={(value) => value && setDateFilter(value)}
            className="justify-start"
          >
            <ToggleGroupItem
              value={dateFilterOptions.viewAll}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap"
            >
              View All
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisMonth}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap"
            >
              This Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisYear}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap"
            >
              This Year
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Transfer Cards */}
          {filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">
                {transfers.length === 0 
                  ? "No transfer transactions found."
                  : "No results found for your search."}
              </p>
            </div>
          ) : (
            <>
              {filteredTransfers.map((transfer) => (
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
              
              {hasMore && filteredTransfers.length === transfers.length && (
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