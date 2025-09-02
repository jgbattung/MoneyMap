"use client"

import CreateExpenseTypeSheet from '@/components/forms/CreateExpenseTypeSheet'
import { Icons } from '@/components/icons'
import useExpenseTypes from '@/hooks/useExpenseTypes'
import React, { useState } from 'react'

const Budgets = () => {
  const { expenseTypes, isLoading, error, refetchExpenseTypes } = useExpenseTypes();
  const [createExpenseTypeSheetOpen, setCreateExpenseTypeSheetOpen] = useState(false);

  return (
    <div className="h-dvh max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Expense type and budgets</h1>

        <button
          onClick={() => setCreateExpenseTypeSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add expense type</span>
        </button>

        <CreateExpenseTypeSheet
          open={createExpenseTypeSheetOpen}
          onOpenChange={setCreateExpenseTypeSheetOpen}
          className='hidden md:block'
          onCardCreated={refetchExpenseTypes}
        />
      </div>
    </div>
  )
}

export default Budgets