// app/transactions/components/TransactionsMobileView.tsx

"use client"

import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
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

const TransactionsMobileView = () => {
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  
  const [expensesDisplayCount, setExpensesDisplayCount] = useState(ITEMS_PER_LOAD);
  const [incomeDisplayCount, setIncomeDisplayCount] = useState(ITEMS_PER_LOAD);
  const [transfersDisplayCount, setTransfersDisplayCount] = useState(ITEMS_PER_LOAD);

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
          <div className="space-y-2">
            {expensesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenseTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No expense transactions found.</p>
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
                {expensesHasMore && (
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
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="space-y-2">
            {incomeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : incomeTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No income transactions found.</p>
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
                {incomeHasMore && (
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
        )}

        {/* Transfers Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-2">
            {transfersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No transfer transactions found.</p>
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
                {transfersHasMore && (
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