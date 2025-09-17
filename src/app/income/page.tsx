"use client"

import CreateIncomeTypeDrawer from '@/components/forms/CreateIncomeTypeDrawer';
import CreateIncomeTypeSheet from '@/components/forms/CreateIncomeTypeSheet';
import { Icons } from '@/components/icons';
import IncomeTypeCard from '@/components/shared/IncomeTypeCard';
import SkeletonBudgetCard from '@/components/shared/SkeletonBudgetCard';
import { Button } from '@/components/ui/button';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery'
import React, { useState } from 'react'

const Income = () => {
  const { incomeTypes, isLoading, error } = useIncomeTypesQuery();
  const [createIncomeTypeSheetOpen, setCreateIncomeTypeSheetOpen] = useState(false);
  const [createIncomeTypeDrawerOpen, setCreateIncomeTypeDrawerOpen] = useState(false);
  const [selectedIncomeTypeId, setSelectedIncomeTypeId] = useState<string>('');

  // const handleIncomeTypeClick = (budgetId: string) => {
  //   setSelectedExpenseTypeId(budgetId);

  //   if (window.innerWidth >= 768) {
  //     setCreateIncomeTypeSheetOpen(true);
  //   } else {
  //     setCreateIncomeTypeDrawerOpen(true);
  //   }
  // }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
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
          <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load income types</p>
          <p className='text-muted-foreground'>{error}</p>
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
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'
      >
        {incomeTypes.map((income) => (
          <IncomeTypeCard
            key={income.id}
            name={income.name}
            monthlyTarget={income.monthlyTarget}
          />
        ))}
      </div>
      ) }
    </div>
  )
}

export default Income