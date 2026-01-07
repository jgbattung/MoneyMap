// app/transactions/components/TransactionsMobileView.tsx

"use client"

import React, { useState, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { SearchIcon, Loader2 } from 'lucide-react';
import CompactTransactionCard from './CompactTransactionCard';
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import EditExpenseDrawer from '@/components/forms/EditExpenseDrawer';
import EditIncomeDrawer from '@/components/forms/EditIncomeDrawer';
import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import { format } from 'date-fns';

type TabType = 'expenses' | 'income' | 'transfers';

const ITEMS_PER_LOAD = 15;

const dateFilterOptions = {
  viewAll: "view-all",
  thisMonth: "this-month",
  thisYear: "this-year",
};

const TransactionsMobileView = () => {
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

  const [expenseDateFilter, setExpenseDateFilter] = useState(dateFilterOptions.viewAll);
  const [incomeDateFilter, setIncomeDateFilter] = useState(dateFilterOptions.viewAll);
  const [transferDateFilter, setTransferDateFilter] = useState(dateFilterOptions.viewAll);

  const [editExpenseDrawerOpen, setEditExpenseDrawerOpen] = useState(false);
  const [editIncomeDrawerOpen, setEditIncomeDrawerOpen] = useState(false);
  const [editTransferDrawerOpen, setEditTransferDrawerOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');

  const { 
    expenseTransactions, 
    hasMore: expensesHasMore, 
    isLoading: expensesLoading 
  } = useExpenseTransactionsQuery(
    0, 
    expensesDisplayCount,
    debouncedExpenseSearch,
    expenseDateFilter
  );

  const { 
    incomeTransactions, 
    hasMore: incomeHasMore, 
    isLoading: incomeLoading 
  } = useIncomeTransactionsQuery(
    0, 
    incomeDisplayCount,
    debouncedIncomeSearch,
    incomeDateFilter
  );

  const { 
    transfers, 
    hasMore: transfersHasMore, 
    isLoading: transfersLoading 
  } = useTransfersQuery(
    0, 
    transfersDisplayCount,
    debouncedTransferSearch,
    transferDateFilter
  );

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
    if (debouncedExpenseSearch || expenseDateFilter !== dateFilterOptions.viewAll) {
      setExpensesDisplayCount(ITEMS_PER_LOAD);
    }
  }, [debouncedExpenseSearch, expenseDateFilter]);

  useEffect(() => {
    if (debouncedIncomeSearch || incomeDateFilter !== dateFilterOptions.viewAll) {
      setIncomeDisplayCount(ITEMS_PER_LOAD);
    }
  }, [debouncedIncomeSearch, incomeDateFilter]);

  useEffect(() => {
    if (debouncedTransferSearch || transferDateFilter !== dateFilterOptions.viewAll) {
      setTransfersDisplayCount(ITEMS_PER_LOAD);
    }
  }, [debouncedTransferSearch, transferDateFilter]);

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

  // Determine if filtering is active for each tab
  const isExpenseFiltering = debouncedExpenseSearch.length > 0 || expenseDateFilter !== dateFilterOptions.viewAll;
  const isIncomeFiltering = debouncedIncomeSearch.length > 0 || incomeDateFilter !== dateFilterOptions.viewAll;
  const isTransferFiltering = debouncedTransferSearch.length > 0 || transferDateFilter !== dateFilterOptions.viewAll;

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
            <InputGroup>
              <InputGroupInput 
                placeholder="Search expenses..." 
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
                disabled={expensesLoading}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            <ToggleGroup
              type="single"
              value={expenseDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => !expensesLoading && value && setExpenseDateFilter(value)}
              className="justify-start"
              disabled={expensesLoading}
            >
              <ToggleGroupItem
                value={dateFilterOptions.viewAll}
                disabled={expensesLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View All
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisMonth}
                disabled={expensesLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisYear}
                disabled={expensesLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Year
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Transaction Cards */}
            <div className="space-y-2">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenseTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No results found for your search.</p>
                </div>
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
                      onClick={() => handleExpenseClick(expense.id)}
                    />
                  ))}
                  {!isExpenseFiltering && expensesHasMore && (
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
            {/* Search - Always visible, disabled when loading */}
            <InputGroup>
              <InputGroupInput 
                placeholder="Search income..." 
                value={incomeSearchTerm}
                onChange={(e) => setIncomeSearchTerm(e.target.value)}
                disabled={incomeLoading}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            <ToggleGroup
              type="single"
              value={incomeDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => !incomeLoading && value && setIncomeDateFilter(value)}
              className="justify-start"
              disabled={incomeLoading}
            >
              <ToggleGroupItem
                value={dateFilterOptions.viewAll}
                disabled={incomeLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View All
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisMonth}
                disabled={incomeLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisYear}
                disabled={incomeLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Year
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Transaction Cards */}
            <div className="space-y-2">
              {incomeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : incomeTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No results found for your search.</p>
                </div>
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
                      onClick={() => handleIncomeClick(income.id)}
                    />
                  ))}
                  {!isIncomeFiltering && incomeHasMore && (
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
            <InputGroup>
              <InputGroupInput 
                placeholder="Search transfers..." 
                value={transferSearchTerm}
                onChange={(e) => setTransferSearchTerm(e.target.value)}
                disabled={transfersLoading}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            <ToggleGroup
              type="single"
              value={transferDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => !transfersLoading && value && setTransferDateFilter(value)}
              className="justify-start"
              disabled={transfersLoading}
            >
              <ToggleGroupItem
                value={dateFilterOptions.viewAll}
                disabled={transfersLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View All
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisMonth}
                disabled={transfersLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisYear}
                disabled={transfersLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Year
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Transaction Cards */}
            <div className="space-y-2">
              {transfersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : transfers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No results found for your search.</p>
                </div>
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
                      onClick={() => handleTransferClick(transfer.id)}
                    />
                  ))}
                  {!isTransferFiltering && transfersHasMore && (
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