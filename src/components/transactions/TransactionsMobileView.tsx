"use client"

import React, { useState, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';
import { MobileFilterBar } from './filters/MobileFilterBar';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import {
  useExpenseFilterOptions,
  useIncomeFilterOptions,
  useTransferFilterOptions,
} from '@/hooks/useTransactionFilterOptions';
import { EmptyState } from '@/components/shared/EmptyState';
import CompactTransactionCard from './CompactTransactionCard';
import { SkeletonCompactTransactionCard } from './SkeletonCompactTransactionCard';
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import EditExpenseDrawer from '@/components/forms/EditExpenseDrawer';
import EditIncomeDrawer from '@/components/forms/EditIncomeDrawer';
import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import { format } from 'date-fns';

type TabType = 'expenses' | 'income' | 'transfers';

const ITEMS_PER_LOAD = 15;

interface TransactionsMobileViewProps {
  accountId?: string;
}

const TransactionsMobileView = ({ accountId }: TransactionsMobileViewProps = {}) => {
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  
  const [expensesDisplayCount, setExpensesDisplayCount] = useState(ITEMS_PER_LOAD);
  const [incomeDisplayCount, setIncomeDisplayCount] = useState(ITEMS_PER_LOAD);
  const [transfersDisplayCount, setTransfersDisplayCount] = useState(ITEMS_PER_LOAD);

  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [transferSearchTerm, setTransferSearchTerm] = useState('');
  
  const [debouncedExpenseSearch, setDebouncedExpenseSearch] = useState('');
  const [debouncedIncomeSearch, setDebouncedIncomeSearch] = useState('');
  const [debouncedTransferSearch, setDebouncedTransferSearch] = useState('');

  const expenseFilters = useTransactionFilters();
  const incomeFilters = useTransactionFilters();
  const transferFilters = useTransactionFilters();
  const expenseFilterOptions = useExpenseFilterOptions();
  const incomeFilterOptions = useIncomeFilterOptions();
  const transferFilterOptions = useTransferFilterOptions();

  const [editExpenseDrawerOpen, setEditExpenseDrawerOpen] = useState(false);
  const [editIncomeDrawerOpen, setEditIncomeDrawerOpen] = useState(false);
  const [editTransferDrawerOpen, setEditTransferDrawerOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');

  const {
    expenseTransactions,
    hasMore: expensesHasMore,
    isLoading: expensesLoading,
    isFetchingMore: expensesFetchingMore,
    total: expensesTotal,
    totalAmount: expensesTotalAmount,
  } = useExpenseTransactionsQuery({
    skip: 0,
    take: expensesDisplayCount,
    search: debouncedExpenseSearch,
    ...expenseFilters.queryDates,
    filters: expenseFilters.filters,
    accountId,
  });

  const {
    incomeTransactions,
    hasMore: incomeHasMore,
    isLoading: incomeLoading,
    isFetchingMore: incomeFetchingMore,
    total: incomeTotal,
    totalAmount: incomeTotalAmount,
  } = useIncomeTransactionsQuery({
    skip: 0,
    take: incomeDisplayCount,
    search: debouncedIncomeSearch,
    ...incomeFilters.queryDates,
    filters: incomeFilters.filters,
    accountId,
  });

  const {
    transfers,
    hasMore: transfersHasMore,
    isLoading: transfersLoading,
    isFetchingMore: transfersFetchingMore,
    total: transfersTotal,
  } = useTransfersQuery({
    skip: 0,
    take: transfersDisplayCount,
    search: debouncedTransferSearch,
    ...transferFilters.queryDates,
    filters: transferFilters.filters,
    accountId,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExpenseSearch(expenseSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [expenseSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIncomeSearch(incomeSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [incomeSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTransferSearch(transferSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [transferSearchTerm]);

  useEffect(() => {
    setExpensesDisplayCount(ITEMS_PER_LOAD);
  }, [debouncedExpenseSearch, expenseFilters.preset, expenseFilters.filters]);

  useEffect(() => {
    setIncomeDisplayCount(ITEMS_PER_LOAD);
  }, [debouncedIncomeSearch, incomeFilters.preset, incomeFilters.filters]);

  useEffect(() => {
    setTransfersDisplayCount(ITEMS_PER_LOAD);
  }, [debouncedTransferSearch, transferFilters.preset, transferFilters.filters]);

  const handleLoadMoreExpenses = () => {
    setExpensesDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  const handleLoadMoreIncome = () => {
    setIncomeDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  const handleLoadMoreTransfers = () => {
    setTransfersDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  const handleExpenseClick = (id: string) => {
    setSelectedTransactionId(id);
    setEditExpenseDrawerOpen(true);
  };

  const handleIncomeClick = (id: string) => {
    setSelectedTransactionId(id);
    setEditIncomeDrawerOpen(true);
  };

  const handleTransferClick = (id: string) => {
    setSelectedTransactionId(id);
    setEditTransferDrawerOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Tabs */}
        <ToggleGroup
          type="single"
          value={activeTab}
          variant="outline"
          size="sm"
          onValueChange={(value) => value && setActiveTab(value as TabType)}
          className="justify-start"
        >
          <ToggleGroupItem
            value="expenses"
            className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2"
          >
            Expenses
          </ToggleGroupItem>
          <ToggleGroupItem
            value="income"
            className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2"
          >
            Income
          </ToggleGroupItem>
          <ToggleGroupItem
            value="transfers"
            className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2"
          >
            Transfers
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <MobileFilterBar
              kind="expense"
              filterState={expenseFilters}
              options={expenseFilterOptions}
              hideAccount={!!accountId}
              searchTerm={expenseSearchTerm}
              onSearchChange={setExpenseSearchTerm}
              searchPlaceholder="Search expenses..."
              isLoading={expensesLoading}
              isSearching={debouncedExpenseSearch.length > 0}
              total={expensesTotal}
              totalAmount={expensesTotalAmount}
            />

            {/* Transaction Cards */}
            <div className="space-y-2">
              {expensesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCompactTransactionCard key={index} />
                  ))}
                </div>
              ) : expenseTransactions.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No transactions match your filters."
                  description="Try adjusting your search or filters."
                  variant="table"
                />
              ) : (
                <>
                  {expenseTransactions.map((expense) => (
                    <CompactTransactionCard
                      key={expense.id}
                      id={expense.id}
                      type="EXPENSE"
                      name={expense.name}
                      amount={parseFloat(expense.amount)}
                      date={format(new Date(expense.date), 'MMM d')}
                      category={expense.expenseType.name}
                      account={expense.account.name}
                      subcategory={expense.expenseSubcategory?.name}
                      tags={expense.tags}
                      onClick={() => handleExpenseClick(expense.id)}
                    />
                  ))}
                  {expensesFetchingMore && (
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: 3 }, (_, index) => (
                        <SkeletonCompactTransactionCard key={index} />
                      ))}
                    </div>
                  )}
                  {expensesHasMore && !expensesFetchingMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={handleLoadMoreExpenses}
                    >
                      Load More
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="space-y-4">
            <MobileFilterBar
              kind="income"
              filterState={incomeFilters}
              options={incomeFilterOptions}
              hideAccount={!!accountId}
              searchTerm={incomeSearchTerm}
              onSearchChange={setIncomeSearchTerm}
              searchPlaceholder="Search income..."
              isLoading={incomeLoading}
              isSearching={debouncedIncomeSearch.length > 0}
              total={incomeTotal}
              totalAmount={incomeTotalAmount}
            />

            {/* Transaction Cards */}
            <div className="space-y-2">
              {incomeLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCompactTransactionCard key={index} />
                  ))}
                </div>
              ) : incomeTransactions.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No transactions match your filters."
                  description="Try adjusting your search or filters."
                  variant="table"
                />
              ) : (
                <>
                  {incomeTransactions.map((income) => (
                    <CompactTransactionCard
                      key={income.id}
                      id={income.id}
                      type="INCOME"
                      name={income.name}
                      amount={parseFloat(income.amount)}
                      date={format(new Date(income.date), 'MMM d')}
                      category={income.incomeType.name}
                      account={income.account.name}
                      tags={income.tags}
                      onClick={() => handleIncomeClick(income.id)}
                    />
                  ))}
                  {incomeFetchingMore && (
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: 3 }, (_, index) => (
                        <SkeletonCompactTransactionCard key={index} />
                      ))}
                    </div>
                  )}
                  {incomeHasMore && !incomeFetchingMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={handleLoadMoreIncome}
                    >
                      Load More
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Transfers Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            <MobileFilterBar
              kind="transfer"
              filterState={transferFilters}
              options={transferFilterOptions}
              searchTerm={transferSearchTerm}
              onSearchChange={setTransferSearchTerm}
              searchPlaceholder="Search transfers..."
              isLoading={transfersLoading}
              isSearching={debouncedTransferSearch.length > 0}
              total={transfersTotal}
            />

            {/* Transaction Cards */}
            <div className="space-y-2">
              {transfersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCompactTransactionCard key={index} />
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
                    <CompactTransactionCard
                      key={transfer.id}
                      id={transfer.id}
                      type="TRANSFER"
                      name={transfer.name}
                      amount={transfer.amount}
                      date={format(new Date(transfer.date), 'MMM d')}
                      category={transfer.transferType.name}
                      account={transfer.fromAccount.name}
                      toAccount={transfer.toAccount.name}
                      tags={transfer.tags}
                      onClick={() => handleTransferClick(transfer.id)}
                    />
                  ))}
                  {transfersFetchingMore && (
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: 3 }, (_, index) => (
                        <SkeletonCompactTransactionCard key={index} />
                      ))}
                    </div>
                  )}
                  {transfersHasMore && !transfersFetchingMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={handleLoadMoreTransfers}
                    >
                      Load More
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Drawers */}
      <EditExpenseDrawer
        open={editExpenseDrawerOpen}
        onOpenChange={setEditExpenseDrawerOpen}
        expenseId={selectedTransactionId}
      />

      <EditIncomeDrawer
        open={editIncomeDrawerOpen}
        onOpenChange={setEditIncomeDrawerOpen}
        incomeTransactionId={selectedTransactionId}
      />

      <EditTransferDrawer
        open={editTransferDrawerOpen}
        onOpenChange={setEditTransferDrawerOpen}
        className="block md:hidden"
        transferId={selectedTransactionId}
      />
    </>
  );
};

export default TransactionsMobileView;