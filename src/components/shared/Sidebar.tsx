"use client"

import React, { useState } from 'react'
import { Icons } from '../icons'
import { navRoutes } from '@/app/constants/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CreateIncomeTransactionSheet from '../forms/CreateIncomeTransactionSheet'
import CreateTransferSheet from '../forms/CreateTransferSheet'

const Sidebar = () => {
  const pathname = usePathname();
  const [createIncomeTransactionSheetOpen, setCreateIncomeTransactionSheetOpen] = useState(false);
  const [createTransferSheetOpen, setCreateTransferSheetOpen] = useState(false);

  const handleAddIncome = () => {
    setCreateIncomeTransactionSheetOpen(true);
  };

  const handleAddTransfer = () => {
    setCreateTransferSheetOpen(true);
  }

  return (
    <>
      <div
        className="hidden md:flex flex-col px-5 w-48 bg-background border-r-2 border-secondary-700">
        <div className='pt-6'>
          HEADER
        </div>

        <div className='flex-1 flex flex-col justify-center'>
          <div className='mb-6'>
            <p className='text-sm text-muted-foreground mb-5'>Quick actions</p>
            <div className='flex flex-col gap-3'>
              {/* Add expense */}
              <button
                // onClick={}
                className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addExpense
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add expense</span>
              </button>

              <button
                onClick={handleAddIncome}
                className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addIncome
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add income</span>
              </button>

              <button
                onClick={handleAddTransfer}
                className='flex items-center w-36 px-4 py-2 gap-2 text-sm font-semibold border border-white/40 rounded-md hover:bg-white/10 transition-colors'
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Icons.addTransfer
                    size={16}
                    className='text-background'
                  />
                </div>
                <span>Add transfer</span>
              </button>
            </div>
          </div>

          <div className='mb-6'>
            <p className='text-sm text-muted-foreground mb-3'>Main menu</p>
            <div className='flex flex-col gap-3'>
              {navRoutes.map((route) => (
                <Link
                  href={route.path}
                  key={route.name}
                  className={`flex gap-2 items-center pl-2.5 pr-3 py-1.5 w-full border rounded-md ${pathname.startsWith(route.path) ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'} transition-all duration-200 ease-in-out`}
                >
                  <route.icon size={20} />
                  <span>{route.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className='pb-6'>
          FOOTER
        </div>
      </div>
      
      <CreateIncomeTransactionSheet
        open={createIncomeTransactionSheetOpen}
        onOpenChange={setCreateIncomeTransactionSheetOpen}
        className="hidden md:block"
      />

      <CreateTransferSheet
        open={createTransferSheetOpen}
        onOpenChange={setCreateTransferSheetOpen}
        className="hidden md:block"
      />
    </>
  )
}

export default Sidebar