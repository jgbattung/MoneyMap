"use client"

import React, { useState } from 'react'
import CreateAccountSheet from '@/components/forms/CreateAccountSheet'
import { Icons } from '@/components/icons'
import CreateAccountDrawer from '@/components/forms/CreateAccountDrawer'
import AccountCard from '@/components/shared/AccountCard'
import { useAccountsQuery } from '@/hooks/useAccountsQuery'
import { Button } from '@/components/ui/button'
import SkeletonAccountCard from '@/components/shared/SkeletonAccountCard'
import EditAccountSheet from '@/components/forms/EditAccountSheet'
import EditAccountDrawer from '@/components/forms/EditAccountDrawer'

const Accounts = () => {
  const { accounts, isLoading, error } = useAccountsQuery();
  const [createAccountSheetOpen, setCreateAccountSheetOpen] = useState(false);
  const [createAccountDrawerOpen, setCreateAccountDrawerOpen] = useState(false);
  const [editAccountSheetOpen, setEditAccountSheetOpen] = useState(false);
  const [editAccountDrawerOpen, setEditAccountDrawerOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const handleAccountClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    
    if (window.innerWidth >= 768) {
      setEditAccountSheetOpen(true);
    } else {
      setEditAccountDrawerOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Accounts</h1>

        <button 
          onClick={() => setCreateAccountSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add account</span>
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
          <span>Add account</span>
        </button>
        <CreateAccountDrawer
          open={createAccountDrawerOpen}
          onOpenChange={setCreateAccountDrawerOpen}
          className="block md:hidden"
        />
      </div>

      <EditAccountSheet
        open={editAccountSheetOpen}
        onOpenChange={setEditAccountSheetOpen}
        className='hidden md:block'
        accountId={selectedAccountId}
      />

      <EditAccountDrawer
        open={editAccountDrawerOpen}
        onOpenChange={setEditAccountDrawerOpen}
        className='block md:hidden'
        accountId={selectedAccountId}
      />

      {isLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonAccountCard key={index} />
          ))}
        </div>
      ) : error ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load accounts</p>
            <p className='text-muted-foreground'>{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-10"
          >
            Try again
          </Button>
        </div>
      ) : accounts.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.wallet
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>No accounts, yet.</p>
            <p className='text-muted-foreground'>You have no accounts, yet! Start managing your finances by adding an account.</p>
          </div>
          <Button
            onClick={() => setCreateAccountSheetOpen(true)}
            className="hidden md:flex mt-10 text-lg px-6 py-6"
          >
            Create your first account
          </Button>

          {/* Mobile button */}
          <Button
            onClick={() => setCreateAccountDrawerOpen(true)}
            className="flex md:hidden mt-10"
          >
            Create your first account
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10'>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              accountType={account.accountType}
              addToNetWorth={account.addToNetWorth}
              currentBalance={account.currentBalance}
              name={account.name}
              onClick={() => handleAccountClick(account.id)}
            />
          ))}
        </div>
      )}

    </div>
  )
}

export default Accounts