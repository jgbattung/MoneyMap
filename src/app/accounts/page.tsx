"use client"

import React, { useState } from 'react'
import CreateAccountSheet from '@/components/forms/CreateAccountSheet'
import { Icons } from '@/components/icons'
import CreateAccountDrawer from '@/components/forms/CreateAccountDrawer'
import AccountCard from '@/components/shared/AccountCard'
import useAccounts from '@/hooks/useAccounts'

const Accounts = () => {
  const { accounts, isLoading, error } = useAccounts();
  const [createAccountSheetOpen, setCreateAccountSheetOpen] = useState(false);
  const [createAccountDrawerOpen, setCreateAccountDrawerOpen] = useState(false);

  console.log(accounts);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Accounts</h1>

        <button 
          onClick={() => setCreateAccountSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Create account</span>
        </button>
        <CreateAccountSheet
          open={createAccountSheetOpen}
          onOpenChange={setCreateAccountSheetOpen}
          className="hidden md:block"
        />

        <button 
          onClick={() => setCreateAccountDrawerOpen(true)}
          className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
        >
          <Icons.createAccount size={16} />
          <span>Create account</span>
        </button>
        <CreateAccountDrawer
          open={createAccountDrawerOpen}
          onOpenChange={setCreateAccountDrawerOpen}
          className="block md:hidden"
        />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            accountType={account.accountType}
            addToNetWorth={account.addToNetWorth}
            currentBalance={account.currentBalance}
            name={account.name}
          />
        ))}
      </div>
    </div>
  )
}

export default Accounts