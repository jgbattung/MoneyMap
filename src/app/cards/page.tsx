"use client"

import CreateCardDrawer from '@/components/forms/CreateCardDrawer';
import CreateCardSheet from '@/components/forms/CreateCardSheet';
import EditCardDrawer from '@/components/forms/EditCardDrawer';
import EditCardSheet from '@/components/forms/EditCardSheet';
import { Icons } from '@/components/icons';
import CreditCardCard from '@/components/shared/CreditCardCard';
import SkeletonCardCard from '@/components/shared/SkeletonCardCard';
import { Button } from '@/components/ui/button';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import React, { useState } from 'react'

const Cards = () => {
  const { cards, isLoading, error } = useCardsQuery();
  const [createCardsSheetOpen, setCreateCardsSheetOpen] = useState(false);
  const [createCardsDrawerOpen, setCreateCardsDrawerOpen] = useState(false);
  const [editCardSheetOpen, setEditCardSheetOpen] = useState(false);
  const [editCardDrawerOpen, setEditCardDrawerOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  const handleCardClick = (accountId: string) => {
    setSelectedCardId(accountId);

    if (window.innerWidth >= 768) {
      setEditCardSheetOpen(true);
    } else {
      setEditCardDrawerOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Cards</h1>
      
        <button 
          onClick={() => setCreateCardsSheetOpen(true)}
          className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
        >
          <Icons.createAccount size={20} />
          <span>Add credit card</span>
        </button>
        <CreateCardSheet
          open={createCardsSheetOpen}
          onOpenChange={setCreateCardsSheetOpen}
          className='hidden md:block'
        />

        <button
          onClick={() => setCreateCardsDrawerOpen(true)}
          className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
        >
          <Icons.createAccount size={16} />
          <span>Add credit card</span>
        </button>
        <CreateCardDrawer
          open={createCardsDrawerOpen}
          onOpenChange={setCreateCardsDrawerOpen}
          className='block md:hidden'
        />
      </div>

      <EditCardSheet
        open={editCardSheetOpen}
        onOpenChange={setEditCardSheetOpen}
        className='hidden md:block'
        cardId={selectedCardId}
      />

      <EditCardDrawer
        open={editCardDrawerOpen}
        onOpenChange={setEditCardDrawerOpen}
        className='block md:hidden'
        cardId={selectedCardId}
      />

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonCardCard key={index} />
          ))}
        </div>
      ) : error ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load credit cards</p>
            <p className='text-muted-foreground'>{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-10"
          >
            Try again
          </Button>
        </div>
      ) : cards.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.creditCardIcon
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>No credit cards, yet.</p>
            <p className='text-muted-foreground'>You have no credit cards, yet! Start tracking your credit cards by adding one.</p>
          </div>
          <Button
            onClick={() => setCreateCardsSheetOpen(true)}
            className="hidden md:flex mt-10 text-lg px-6 py-6"
          >
            Add your first credit card
          </Button>
          
          {/* Mobile button */}
          <Button
            onClick={() => setCreateCardsDrawerOpen(true)}
            className="flex md:hidden mt-10"
          >
            Add your first credit card
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {cards.map((card) => (
            <CreditCardCard
              key={card.name}
              name={card.name}
              statementDate={card.statementDate}
              dueDate={card.dueDate}
              currentBalance={card.currentBalance}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Cards