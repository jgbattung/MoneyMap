"use client"

import CreateCardDrawer from '@/components/forms/CreateCardDrawer';
import CreateCardSheet from '@/components/forms/CreateCardSheet';
import EditCardDrawer from '@/components/forms/EditCardDrawer';
import { Icons } from '@/components/icons';
import CreditCardCard from '@/components/shared/CreditCardCard';
import SkeletonCardCard from '@/components/shared/SkeletonCardCard';
import useCards from '@/hooks/useCards';
import React, { useState } from 'react'

const Cards = () => {
  const { cards, isLoading, error, refetchCards } = useCards();
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
    <div className="h-dvh max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col">
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
          onCardCreated={refetchCards}
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
          onCardCreated={refetchCards}
        />
      </div>

      <EditCardDrawer
        open={editCardDrawerOpen}
        onOpenChange={setEditCardDrawerOpen}
        className='block md:hidden'
        cardId={selectedCardId}
        onCardUpdated={refetchCards}
      />

      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonCardCard key={index} />
          ))}
        </div>
      ) : error? (
        <div>
          ERROR
        </div>
      ) : cards.length === 0 ? (
        <div>
          NO CARDS YET
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