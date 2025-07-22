"use client"

import CreateAccountSheet from '@/components/forms/CreateAccountSheet'
import React, { useState } from 'react'

const Accounts = () => {
  const [createAccountOpen, setCreateAccountOpen] = useState(false)

  const handleCreateAccount = () => {
    setCreateAccountOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl md:text-3xl lg:text-4xl font-bold'>Accounts</h1>
        <CreateAccountSheet 
          open={createAccountOpen} 
          onOpenChange={setCreateAccountOpen}
          className="hidden md:block"  // Only show on desktop+
        />
      </div>
    </div>
  )
}

export default Accounts