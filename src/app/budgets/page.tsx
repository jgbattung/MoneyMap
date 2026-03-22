"use client"

import CreateExpenseTypeDrawer from '@/components/forms/CreateExpenseTypeDrawer'
import CreateExpenseTypeSheet from '@/components/forms/CreateExpenseTypeSheet'
import EditExpenseTypeDrawer from '@/components/forms/EditExpenseTypeDrawer'
import EditExpenseTypeSheet from '@/components/forms/EditExpenseTypeSheet'
import { Icons } from '@/components/icons'
import BudgetCard from '@/components/shared/BudgetCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import SkeletonBudgetCard from '@/components/shared/SkeletonBudgetCard'
import { Button } from '@/components/ui/button'
import { ExpenseTransaction, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery'
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery'
import { PiggyBank } from 'lucide-react'
import React, { useState } from 'react'

const calculateMonthlySpent = (
  transactions: ExpenseTransaction[],
  expenseTypeId: string,
  month: Date = new Date(),
): number => {
  const targetMonth = month.getMonth();
  const targetYear = month.getFullYear();

  return transactions
    .filter((transaction) => {
      if (transaction.isInstallment) return false;

      if (transaction.expenseTypeId !== expenseTypeId) return false;

      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear
      );
    })
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
}

const Budgets = () => {
  const { budgets, isLoading, error } = useExpenseTypesQuery();
  const { expenseTransactions } = useExpenseTransactionsQuery();
  const [createExpenseTypeSheetOpen, setCreateExpenseTypeSheetOpen] = useState(false);
  const [createExpenseTypeDrawerOpen, setCreateExpenseTypeDrawerOpen] = useState(false);
  const [editExpenseTypeSheetOpen, setEditExpenseTypeSheetOpen] = useState(false);
  const [editExpenseTypeDrawerOpen, setEditExpenseTypeDrawerOpen] = useState(false);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<string>('');

  const sortedBudgets = [...budgets].sort((a, b) => {
  // If both have budgets, sort by budget amount (highest first)
  if (a.monthlyBudget && b.monthlyBudget) {
    return parseFloat(b.monthlyBudget) - parseFloat(a.monthlyBudget);
  }
  // If only a has no budget, put it after b
  if (!a.monthlyBudget && b.monthlyBudget) {
    return 1;
  }
  // If only b has no budget, put it after a
  if (a.monthlyBudget && !b.monthlyBudget) {
    return -1;
  }
  // If both have no budget, maintain original order
  return 0;
});

  const handleExpenseTypeClick = (budgetId: string) => {
    setSelectedExpenseTypeId(budgetId);

    if (window.innerWidth >= 768) {
      setEditExpenseTypeSheetOpen(true);
    } else {
      setEditExpenseTypeDrawerOpen(true);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
      <PageHeader
        title="Budgets"
        actions={
          <>
            <button
              onClick={() => setCreateExpenseTypeSheetOpen(true)}
              className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
            >
              <Icons.createAccount size={20} />
              <span>Add budget</span>
            </button>
            <button
              onClick={() => setCreateExpenseTypeDrawerOpen(true)}
              className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
            >
              <Icons.createAccount size={16} />
              <span>Add budget</span>
            </button>
          </>
        }
      />
      <CreateExpenseTypeSheet
        open={createExpenseTypeSheetOpen}
        onOpenChange={setCreateExpenseTypeSheetOpen}
        className='hidden md:block'
      />
      <CreateExpenseTypeDrawer
        open={createExpenseTypeDrawerOpen}
        onOpenChange={setCreateExpenseTypeDrawerOpen}
        className="block md:hidden"
      />

      <EditExpenseTypeSheet
        open={editExpenseTypeSheetOpen}
        onOpenChange={setEditExpenseTypeSheetOpen}
        className='hidden md:block'
        budgetId={selectedExpenseTypeId}
      />

      <EditExpenseTypeDrawer
        open={editExpenseTypeDrawerOpen}
        onOpenChange={setEditExpenseTypeDrawerOpen}
        className='block md:hidden'
        budgetId={selectedExpenseTypeId}
      />

      {isLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBudgetCard key={index} />
          ))}
        </div>
      ) : error ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load budgets</p>
            <p className='text-muted-foreground'>{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-10"
          >
            Try again
          </Button>
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets yet"
          description="Add your first budget to start managing your spending."
          action={{
            label: "Add your first budget",
            onClick: () => {
              if (window.innerWidth >= 768) {
                setCreateExpenseTypeSheetOpen(true);
              } else {
                setCreateExpenseTypeDrawerOpen(true);
              }
            },
          }}
          variant="page"
        />
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'
        >
          {sortedBudgets.
            filter(budget => budget.name.toLocaleLowerCase() !== 'uncategorized')
            .map((budget) => {
              const spentAmount = calculateMonthlySpent(expenseTransactions, budget.id);
            
            return (
              <BudgetCard
                key={budget.id}
                name={budget.name}
                monthlyBudget={budget.monthlyBudget}
                spentAmount={spentAmount}
                onClick={() => handleExpenseTypeClick(budget.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Budgets