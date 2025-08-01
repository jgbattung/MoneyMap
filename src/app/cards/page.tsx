"use client"

import CreateCardSheet from '@/components/forms/CreateCardSheet';
import { Icons } from '@/components/icons';
import React, { useState } from 'react'

const Cards = () => {
  const [createCardsSheetOpen, setCreateCardsSheetOpen] = useState(false);

  return (
    <div className="h-dvh max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Cards</h1>
      
        <button 
          onClick={() => setCreateCardsSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add card</span>
        </button>
        <CreateCardSheet
          open={createCardsSheetOpen}
          onOpenChange={setCreateCardsSheetOpen}
          className='hidden md:block'
        />
      
      </div>
    </div>
  )
}

export default Cards