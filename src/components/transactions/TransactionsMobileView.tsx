// app/transactions/components/TransactionsMobileView.tsx

"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import CompactTransactionCard from './CompactTransactionCard';
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import EditExpenseDrawer from '@/components/forms/EditExpenseDrawer';
import EditIncomeDrawer from '@/components/forms/EditIncomeDrawer';
import EditTransferDrawer from '@/components/forms/EditTransferDrawer';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'expenses' | 'income' | 'transfers';

const ITEMS_PER_LOAD = 15;

const dateFilterOptions = {
  viewAll: "view-all",
  thisWeek: "this-week",
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
  } = useExpenseTransactionsQuery(0, expensesDisplayCount);

  const { 
    incomeTransactions, 
    hasMore: incomeHasMore, 
    isLoading: incomeLoading 
  } = useIncomeTransactionsQuery(0, incomeDisplayCount);

  const { 
    transfers, 
    hasMore: transfersHasMore, 
    isLoading: transfersLoading 
  } = useTransfersQuery(0, transfersDisplayCount);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExpenseSearch(expenseSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [expenseSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIncomeSearch(incomeSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [incomeSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTransferSearch(transferSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [transferSearchTerm]);

  const filteredExpenses = useMemo(() => {
    return expenseTransactions.filter((expense) => {
      if (expenseDateFilter !== dateFilterOptions.viewAll) {
        const expenseDate = new Date(expense.date);
        const now = new Date();

        if (expenseDateFilter === dateFilterOptions.thisWeek) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (expenseDate < weekStart) return false;
        } else if (expenseDateFilter === dateFilterOptions.thisMonth) {
          if (expenseDate.getMonth() !== now.getMonth() || 
              expenseDate.getFullYear() !== now.getFullYear()) return false;
        } else if (expenseDateFilter === dateFilterOptions.thisYear) {
          if (expenseDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!debouncedExpenseSearch) return true;
      
      const searchLower = debouncedExpenseSearch.toLowerCase();
      return (
        expense.name.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.account.name.toLowerCase().includes(searchLower) ||
        expense.expenseType.name.toLowerCase().includes(searchLower) ||
        expense.expenseSubcategory?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [expenseTransactions, expenseDateFilter, debouncedExpenseSearch]);

  const filteredIncome = useMemo(() => {
    return incomeTransactions.filter((income) => {
      if (incomeDateFilter !== dateFilterOptions.viewAll) {
        const incomeDate = new Date(income.date);
        const now = new Date();

        if (incomeDateFilter === dateFilterOptions.thisWeek) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (incomeDate < weekStart) return false;
        } else if (incomeDateFilter === dateFilterOptions.thisMonth) {
          if (incomeDate.getMonth() !== now.getMonth() || 
              incomeDate.getFullYear() !== now.getFullYear()) return false;
        } else if (incomeDateFilter === dateFilterOptions.thisYear) {
          if (incomeDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!debouncedIncomeSearch) return true;
      
      const searchLower = debouncedIncomeSearch.toLowerCase();
      return (
        income.name.toLowerCase().includes(searchLower) ||
        income.description?.toLowerCase().includes(searchLower) ||
        income.account.name.toLowerCase().includes(searchLower) ||
        income.incomeType.name.toLowerCase().includes(searchLower)
      );
    });
  }, [incomeTransactions, incomeDateFilter, debouncedIncomeSearch]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      if (transferDateFilter !== dateFilterOptions.viewAll) {
        const transferDate = new Date(transfer.date);
        const now = new Date();

        if (transferDateFilter === dateFilterOptions.thisWeek) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (transferDate < weekStart) return false;
        } else if (transferDateFilter === dateFilterOptions.thisMonth) {
          if (transferDate.getMonth() !== now.getMonth() || 
              transferDate.getFullYear() !== now.getFullYear()) return false;
        } else if (transferDateFilter === dateFilterOptions.thisYear) {
          if (transferDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!debouncedTransferSearch) return true;
      
      const searchLower = debouncedTransferSearch.toLowerCase();
      return (
        transfer.name.toLowerCase().includes(searchLower) ||
        transfer.notes?.toLowerCase().includes(searchLower) ||
        transfer.fromAccount.name.toLowerCase().includes(searchLower) ||
        transfer.toAccount.name.toLowerCase().includes(searchLower) ||
        transfer.transferType.name.toLowerCase().includes(searchLower)
      );
    });
  }, [transfers, transferDateFilter, debouncedTransferSearch]);

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
            {/* Search */}
            <InputGroup>
              <InputGroupInput 
                placeholder="Search expenses..." 
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            {/* Date Filter */}
            <ToggleGroup
              type="single"
              value={expenseDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => value && setExpenseDateFilter(value)}
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

            {/* Transaction Cards */}
            <div className="space-y-2">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    {expenseTransactions.length === 0 
                      ? "No expense transactions found."
                      : "No results found for your search."}
                  </p>
                </div>
              ) : (
                <>
                  {filteredExpenses.map((expense) => (
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
                  {expensesHasMore && filteredExpenses.length === expenseTransactions.length && (
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
            {/* Search */}
            <InputGroup>
              <InputGroupInput 
                placeholder="Search income..." 
                value={incomeSearchTerm}
                onChange={(e) => setIncomeSearchTerm(e.target.value)}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            {/* Date Filter */}
            <ToggleGroup
              type="single"
              value={incomeDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => value && setIncomeDateFilter(value)}
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

            {/* Transaction Cards */}
            <div className="space-y-2">
              {incomeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredIncome.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    {incomeTransactions.length === 0 
                      ? "No income transactions found."
                      : "No results found for your search."}
                  </p>
                </div>
              ) : (
                <>
                  {filteredIncome.map((income) => (
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
                  {incomeHasMore && filteredIncome.length === incomeTransactions.length && (
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
            {/* Search */}
            <InputGroup>
              <InputGroupInput 
                placeholder="Search transfers..." 
                value={transferSearchTerm}
                onChange={(e) => setTransferSearchTerm(e.target.value)}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            {/* Date Filter */}
            <ToggleGroup
              type="single"
              value={transferDateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => value && setTransferDateFilter(value)}
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

            {/* Transaction Cards */}
            <div className="space-y-2">
              {transfersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTransfers.length === 0 ? (
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
                  {transfersHasMore && filteredTransfers.length === transfers.length && (
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