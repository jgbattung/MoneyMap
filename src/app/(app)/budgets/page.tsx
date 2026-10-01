"use client"

import CreateExpenseTypeDrawer from '@/components/forms/CreateExpenseTypeDrawer'
import CreateExpenseTypeSheet from '@/components/forms/CreateExpenseTypeSheet'
import EditExpenseTypeDrawer from '@/components/forms/EditExpenseTypeDrawer'
import EditExpenseTypeSheet from '@/components/forms/EditExpenseTypeSheet'
import { Icons } from '@/components/icons'
import BudgetCard from '@/components/shared/BudgetCard'
import BudgetsTable, { type BudgetTotals } from '@/components/budgets/BudgetsTable'
import BudgetTotalsSummary from '@/components/budgets/BudgetTotalsSummary'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import SkeletonBudgetCard from '@/components/shared/SkeletonBudgetCard'
import { Button } from '@/components/ui/button'
import { useBudgetStatus } from '@/hooks/useBudgetStatus'
import { PiggyBank } from 'lucide-react'
import React, { useState } from 'react'

const Budgets = () => {
  const { budgets, isLoading, error } = useBudgetStatus({ all: true })
  const [createExpenseTypeSheetOpen, setCreateExpenseTypeSheetOpen] = useState(false);
  const [createExpenseTypeDrawerOpen, setCreateExpenseTypeDrawerOpen] = useState(false);
  const [editExpenseTypeSheetOpen, setEditExpenseTypeSheetOpen] = useState(false);
  const [editExpenseTypeDrawerOpen, setEditExpenseTypeDrawerOpen] = useState(false);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<string>('');

  // Exclude the "uncategorized" catch-all so the visible rows/cards sum to the totals.
  const visibleBudgets = budgets.filter(
    (b) => b.name.toLocaleLowerCase() !== 'uncategorized'
  );

  const sortedBudgets = [...visibleBudgets].sort((a, b) => {
    if (a.monthlyBudget != null && b.monthlyBudget != null) {
      return b.monthlyBudget - a.monthlyBudget;
    }
    if (a.monthlyBudget == null && b.monthlyBudget != null) return 1;
    if (a.monthlyBudget != null && b.monthlyBudget == null) return -1;
    return 0;
  });

  const totals: BudgetTotals = sortedBudgets.reduce(
    (acc, b) => {
      if (b.monthlyBudget != null) acc.totalBudgeted += b.monthlyBudget;
      acc.totalSpent += b.spentAmount;
      return acc;
    },
    { totalBudgeted: 0, totalSpent: 0, totalRemaining: 0 }
  );
  totals.totalRemaining = totals.totalBudgeted - totals.totalSpent;

  const handleExpenseTypeClick = (budgetId: string) => {
    setSelectedExpenseTypeId(budgetId);

    if (window.innerWidth >= 768) {
      setEditExpenseTypeSheetOpen(true);
    } else {
      setEditExpenseTypeDrawerOpen(true);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-36 md:pb-6 flex flex-col">
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
      ) : sortedBudgets.length === 0 ? (
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
        <>
          {/* Desktop: table with live totals footer */}
          <div className="hidden md:block mt-10">
            <BudgetsTable
              budgets={sortedBudgets}
              onRowClick={handleExpenseTypeClick}
            />
          </div>

          {/* Mobile: totals strip + budget cards */}
          <div className="block md:hidden mt-10 space-y-4">
            <BudgetTotalsSummary totals={totals} />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {sortedBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  name={budget.name}
                  monthlyBudget={budget.monthlyBudget != null ? String(budget.monthlyBudget) : null}
                  spentAmount={budget.spentAmount}
                  onClick={() => handleExpenseTypeClick(budget.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Budgets
