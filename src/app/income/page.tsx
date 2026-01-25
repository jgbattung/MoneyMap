"use client"

import CreateIncomeTypeDrawer from '@/components/forms/CreateIncomeTypeDrawer';
import CreateIncomeTypeSheet from '@/components/forms/CreateIncomeTypeSheet';
import EditIncomeDrawer from '@/components/forms/EditIncomeDrawer';
import EditIncomeTypeDrawer from '@/components/forms/EditIncomeTypeDrawer';
import EditIncomeTypeSheet from '@/components/forms/EditIncomeTypeSheet';
import { Icons } from '@/components/icons';
import IncomeCard from '@/components/shared/IncomeCard';
import IncomeTypeCard from '@/components/shared/IncomeTypeCard';
import SkeletonIncomeTypeCard from '@/components/shared/SkeletonIncomeTypeCard';
import IncomeTable from '@/components/tables/income/IncomeTable';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchIcon } from 'lucide-react';
import { IncomeTransaction, useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery'
import React, { useState, useEffect } from 'react'

const ITEMS_PER_LOAD = 15;

const dateFilterOptions = {
  viewAll: "view-all",
  thisMonth: "this-month",
  thisYear: "this-year",
};

const calculateMonthlyEarned = (
  transactions: IncomeTransaction[],
  incomeTypeId: string,
  month: Date = new Date(),
): number => {
  const targetMonth = month.getMonth();
  const targetYear = month.getFullYear();

    return transactions
    .filter((transaction) => {

      if (transaction.incomeTypeId !== incomeTypeId) return false;

      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear
      );
    })
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
}

const Income = () => {
  const { incomeTypes, isLoading: isLoadingTypes, error: typesError } = useIncomeTypesQuery();
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(dateFilterOptions.viewAll);
  
  const { incomeTransactions, hasMore, isLoading } = useIncomeTransactionsQuery({
    skip: 0,
    take: displayCount,
    search: debouncedSearchTerm,
    dateFilter
  });
  
  const [createIncomeTypeSheetOpen, setCreateIncomeTypeSheetOpen] = useState(false);
  const [createIncomeTypeDrawerOpen, setCreateIncomeTypeDrawerOpen] = useState(false);
  const [editIncomeTypeSheetOpen, setEditIncomeTypeSheetOpen] = useState(false);
  const [editIncomeTypeDrawerOpen, setEditIncomeTypeDrawerOpen] = useState(false);
  const [selectedIncomeTypeId, setSelectedIncomeTypeId] = useState<string>('');
  const [selectedIncomeTransactionId, setSelectedIncomeTransactionId] = useState<string>('');
  const [editIncomeTransactionDrawerOpen, setEditIncomeTransactionDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm || dateFilter !== dateFilterOptions.viewAll) {
      setDisplayCount(ITEMS_PER_LOAD);
    }
  }, [debouncedSearchTerm, dateFilter]);

  const sortedIncomeTypes = [...incomeTypes].sort((a, b) => {
    if (a.monthlyTarget && b.monthlyTarget) {
      return parseFloat(b.monthlyTarget) - parseFloat(a.monthlyTarget);
    }
    if (!a.monthlyTarget && b.monthlyTarget) {
      return 1;
    }
    if (a.monthlyTarget && !b.monthlyTarget) {
      return -1;
    }
    return 0;
  });

  const handleIncomeTypeClick = (budgetId: string) => {
    setSelectedIncomeTypeId(budgetId);

    if (window.innerWidth >= 768) {
      setEditIncomeTypeSheetOpen(true);
    } else {
      setEditIncomeTypeDrawerOpen(true);
    }
  }

  const handleIncomeTransactionCardClick = (incomeTransactionId: string) => {
    setSelectedIncomeTransactionId(incomeTransactionId);
    setEditIncomeTransactionDrawerOpen(true);
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  const isFiltering = debouncedSearchTerm.length > 0 || dateFilter !== dateFilterOptions.viewAll;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Income</h1>

        <button
          onClick={() => setCreateIncomeTypeSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add income category</span>
        </button>

        <CreateIncomeTypeSheet
          open={createIncomeTypeSheetOpen}
          onOpenChange={setCreateIncomeTypeSheetOpen}
          className='hidden md:block'
        />

        <button
          onClick={() => setCreateIncomeTypeDrawerOpen(true)}
          className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
        >
          <Icons.createAccount size={16} />
          <span>Add income category</span>
        </button>

        <CreateIncomeTypeDrawer
          open={createIncomeTypeDrawerOpen}
          onOpenChange={setCreateIncomeTypeDrawerOpen}
          className='block md:hidden'
        />
      </div>
      
      <EditIncomeTypeSheet
        open={editIncomeTypeSheetOpen}
        onOpenChange={setEditIncomeTypeSheetOpen}
        className='hidden md:block'
        incomeTypeId={selectedIncomeTypeId}
      />

      <EditIncomeTypeDrawer
        open={editIncomeTypeDrawerOpen}
        onOpenChange={setEditIncomeTypeDrawerOpen}
        className='block md:hidden'
        incomeTypeId={selectedIncomeTypeId}
      />

      <div className="my-3 md:my-6 lg:mt-12 lg:mb-6">
        <h2 className="text-lg font-semibold md:text-xl lg:text-2xl">
          Income Categories
        </h2>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Track your income sources and monthly targets.
        </p>
      </div>

      {isLoadingTypes ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonIncomeTypeCard key={index} />
          ))}
        </div>
      ) : typesError ? (
      <div className='flex-1 flex flex-col items-center justify-center py-16'>
        <Icons.error
          className='h-24 w-24 mb-10'
          strokeWidth={1.25}
        />
        <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
          <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load income types</p>
          <p className='text-muted-foreground'>{typesError}</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="mt-10"
        >
          Try again
        </Button>
      </div>
      ) : incomeTypes.length === 0 ? (
      <div className='flex-1 flex flex-col items-center justify-center py-16'>
        <Icons.wallet
          className='h-24 w-24 mb-10'
          strokeWidth={1.25}
        />
        <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
          <p className='text-2xl min-md:text-4xl font-semibold'>No income categories, yet.</p>
          <p className='text-muted-foreground'>You have no income categories, yet! Start managing your finances by adding one.</p>
        </div>
        <Button
          onClick={() => setCreateIncomeTypeSheetOpen(true)}
          className="hidden md:flex mt-10 text-lg px-6 py-6"
        >
          Add your first income category
        </Button>
        
        {/* Mobile button */}
        <Button
          onClick={() => setCreateIncomeTypeDrawerOpen(true)}
          className="flex md:hidden mt-10"
        >
          Add your first income category
        </Button>
      </div>
      ) : (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {sortedIncomeTypes
          .filter(income => income.name.toLowerCase() !== 'uncategorized')
          .map((income) => {
            const incomeEarned = calculateMonthlyEarned(incomeTransactions, income.id);

            return (
              <IncomeTypeCard
                key={income.id}
                name={income.name}
                monthlyTarget={income.monthlyTarget}
                incomeAmount={incomeEarned}
                onClick={() => handleIncomeTypeClick(income.id)}
              />
            )
          })}
      </div>
      )}

      <div>
        <div className="my-3 md:my-6 lg:mt-12 lg:mb-6">
          <h2 className="text-lg font-semibold md:text-xl lg:text-2xl">
            Income Transactions
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            View and manage your income history.
          </p>
        </div>

        <div className="md:hidden space-y-4">
          <InputGroup>
            <InputGroupInput 
              placeholder="Search income..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm h-8 py-1" 
              disabled={isLoading}
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
            onValueChange={(value) => !isLoading && value && setDateFilter(value)}
            className="justify-start"
            disabled={isLoading}
          >
            <ToggleGroupItem
              value={dateFilterOptions.viewAll}
              disabled={isLoading}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View All
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisMonth}
              disabled={isLoading}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              This Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value={dateFilterOptions.thisYear}
              disabled={isLoading}
              className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              This Year
            </ToggleGroupItem>
          </ToggleGroup>

          {isLoading ? (
            <div className='grid grid-cols-1 gap-4'>
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonIncomeTypeCard key={index} />
              ))}
            </div>
          ) : incomeTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No results found for your search.</p>
            </div>
          ) : (
            <>
              {incomeTransactions.map((income) => (
                <IncomeCard
                  key={income.id}
                  id={income.id}
                  name={income.name}
                  amount={income.amount.toString()}
                  date={income.date}
                  description={income.description}
                  account={income.account}
                  incomeType={income.incomeType}
                  onClick={() => handleIncomeTransactionCardClick(income.id)}
                />
              ))}
              
              {!isFiltering && hasMore && (
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

        <div className="hidden md:block mb-4">
          <IncomeTable />
        </div>
      </div>

      <EditIncomeDrawer
        open={editIncomeTransactionDrawerOpen}
        onOpenChange={setEditIncomeTransactionDrawerOpen}
        className='block md:hidden'
        incomeTransactionId={selectedIncomeTransactionId}
      />
    </div>
  )
}

export default Income