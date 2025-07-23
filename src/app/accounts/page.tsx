"use client"

import React, { useState } from 'react'
import CreateAccountSheet from '@/components/forms/CreateAccountSheet'
import { Icons } from '@/components/icons'

const Accounts = () => {
  const [createAccountOpen, setCreateAccountOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold'>Accounts</h1>

        <button 
          onClick={() => setCreateAccountOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Create account</span>
        </button>
        <CreateAccountSheet
          open={createAccountOpen}
          onOpenChange={setCreateAccountOpen}
          className="hidden md:block"
        />
      </div>
    </div>
  )
}

export default Accounts