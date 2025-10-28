"use client"

import CreateExpenseTransactionDrawer from "@/components/forms/CreateExpenseTransactionDrawer";
import CreateExpenseTransactionSheet from "@/components/forms/CreateExpenseTransactionSheet";
import { Icons } from "@/components/icons";
import ExpenseCard from "@/components/shared/ExpenseCard";
import SkeletonIncomeTypeCard from "@/components/shared/SkeletonIncomeTypeCard";
import { Button } from "@/components/ui/button";
import { useExpenseTransactionsQuery } from "@/hooks/useExpenseTransactionsQuery";
import { useState } from "react";

const Expenses = () => {
  const { expenseTransactions, isLoading, error } = useExpenseTransactionsQuery();
  const [createExpenseSheetOpen, setCreateExpenseSheetOpen] = useState(false);
  const [createExpenseDrawerOpen, setCreateExpenseDrawerOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Expenses</h1>

        <button
          onClick={() => setCreateExpenseSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add expense</span>
        </button>

        <button
          onClick={() => setCreateExpenseDrawerOpen(true)}
          className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
        >
          <Icons.createAccount size={16} />
          <span>Add expense</span>
        </button>

        <CreateExpenseTransactionSheet
          open={createExpenseSheetOpen}
          onOpenChange={setCreateExpenseSheetOpen}
          className='hidden md:block'
        />

        <CreateExpenseTransactionDrawer
          open={createExpenseDrawerOpen}
          onOpenChange={setCreateExpenseDrawerOpen}
          className="block md:hidden"
        />
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonIncomeTypeCard key={index} />
          ))}
        </div>
      ) : error ? (
      <div className='flex-1 flex flex-col items-center justify-center py-16'>
        <Icons.error
          className='h-24 w-24 mb-10'
          strokeWidth={1.25}
        />
        <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
          <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load expenses</p>
          <p className='text-muted-foreground'>{error}</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="mt-10"
        >
          Try again
        </Button>
      </div>
      ) : expenseTransactions.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.wallet
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>No expenses, yet.</p>
            <p className='text-muted-foreground'>You have no expenses, yet! Start managing your finances by adding one.</p>
          </div>
          <Button
            onClick={() => setCreateExpenseSheetOpen(true)}
            className="hidden md:flex mt-10 text-lg px-6 py-6"
          >
            Add your first expense
          </Button>
          
          <Button
            onClick={() => setCreateExpenseDrawerOpen(true)}
            className="flex md:hidden mt-10"
          >
            Add your first income category
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {expenseTransactions.map((expense) => (
            <ExpenseCard
              key={expense.id}
              id={expense.id}
              name={expense.name}
              amount={expense.amount}
              date={expense.date}
              description={expense.description}
              account={{
                id: expense.account.id,
                name: expense.account.name,
              }}
              expenseType={{
                id: expense.expenseType.id,
                name: expense.expenseType.name
              }}
              isInstallment={expense.isInstallment}
              installmentDuration={expense.installmentDuration}
              remainingInstallments={expense.remainingInstallments}
              installmentStartDate={expense.installmentStartDate}
              monthlyAmount={expense.monthlyAmount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Expenses