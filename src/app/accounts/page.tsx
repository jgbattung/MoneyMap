"use client"

import React, { useState } from 'react'
import CreateAccountSheet from '@/components/forms/CreateAccountSheet'
import { Icons } from '@/components/icons'
import CreateAccountDrawer from '@/components/forms/CreateAccountDrawer'

const Accounts = () => {
  const [createAccountSheetOpen, setCreateAccountSheetOpen] = useState(false);
  const [createAccountDrawerOpen, setCreateAccountDrawerOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
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
    </div>
  )
}

export default Accounts