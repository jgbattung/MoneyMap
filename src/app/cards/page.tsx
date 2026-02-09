"use client"

import CreateCardDrawer from '@/components/forms/CreateCardDrawer';
import CreateCardSheet from '@/components/forms/CreateCardSheet';
import EditCardDrawer from '@/components/forms/EditCardDrawer';
import EditCardSheet from '@/components/forms/EditCardSheet';
import { Icons } from '@/components/icons';
import CreditCardCard from '@/components/shared/CreditCardCard';
import GroupCard from '@/components/shared/GroupCard';
import SkeletonCardCard from '@/components/shared/SkeletonCardCard';
import { Button } from '@/components/ui/button';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react'
import DeleteDialog from '@/components/shared/DeleteDialog';
import { toast } from 'sonner';

const Cards = () => {
  const router = useRouter();
  const { cards, isLoading, error, deleteCard, isDeleting } = useCardsQuery();
  const [createCardsSheetOpen, setCreateCardsSheetOpen] = useState(false);
  const [createCardsDrawerOpen, setCreateCardsDrawerOpen] = useState(false);
  const [editCardSheetOpen, setEditCardSheetOpen] = useState(false);
  const [editCardDrawerOpen, setEditCardDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedCardName, setSelectedCardName] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleCardClick = (cardId: string) => {
    router.push(`/cards/${cardId}`);
  };

  const handleEdit = (cardId: string) => {
    setSelectedCardId(cardId);

    if (window.innerWidth >= 768) {
      setEditCardSheetOpen(true);
    } else {
      setEditCardDrawerOpen(true);
    }
  };

  const handleDelete = async (cardId: string, cardName: string) => {
    setSelectedCardId(cardId);
    setSelectedCardName(cardName);

    // Check for associated transactions first
    const response = await fetch(`/api/cards/${cardId}/transaction-count`);
    const { count } = await response.json();

    if (count > 0) {
      toast.error("Cannot delete card with existing transactions", {
        description: `Please delete the ${count} transactions first.`,
        duration: 10000,
      });
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCard(selectedCardId);

      setDeleteDialogOpen(false);
      setSelectedCardId('');
      setSelectedCardName('');

      toast.success("Card deleted successfully", {
        description: `${selectedCardName} has been deleted.`,
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete card", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  };

  const handleToggleExpand = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const handleGroupClick = (groupName: string) => {
    router.push(`/cards/groups/${encodeURIComponent(groupName)}`);
  };

  // Group cards and sort by total balance
  const { groupedCards, ungroupedCards } = useMemo(() => {
    const groups = new Map<string, typeof cards>();
    const ungrouped: typeof cards = [];

    cards.forEach((card) => {
      if (card.cardGroup) {
        const existing = groups.get(card.cardGroup) || [];
        groups.set(card.cardGroup, [...existing, card]);
      } else {
        ungrouped.push(card);
      }
    });

    // Sort cards within each group by balance (most negative first)
    groups.forEach((groupCards, groupName) => {
      groups.set(
        groupName,
        groupCards.sort((a, b) => parseFloat(a.currentBalance) - parseFloat(b.currentBalance))
      );
    });

    // Sort ungrouped cards by balance
    ungrouped.sort((a, b) => parseFloat(a.currentBalance) - parseFloat(b.currentBalance));

    return { groupedCards: groups, ungroupedCards: ungrouped };
  }, [cards]);

  // Create array of all items (groups + ungrouped) sorted by total balance
  const sortedItems = useMemo(() => {
    const items: Array<
      | { type: "group"; groupName: string; cards: typeof cards; totalBalance: number }
      | { type: "card"; card: typeof cards[0] }
    > = [];

    // Add groups
    groupedCards.forEach((groupCards, groupName) => {
      const totalBalance = groupCards.reduce(
        (sum, card) => sum + parseFloat(card.currentBalance),
        0
      );
      items.push({ type: "group", groupName, cards: groupCards, totalBalance });
    });

    // Add ungrouped cards
    ungroupedCards.forEach((card) => {
      items.push({ type: "card", card });
    });

    // Sort all by balance (most negative = highest debt first)
    items.sort((a, b) => {
      const aBalance = a.type === "group" ? a.totalBalance : parseFloat(a.card.currentBalance);
      const bBalance = b.type === "group" ? b.totalBalance : parseFloat(b.card.currentBalance);
      return aBalance - bBalance;
    });

    return items;
  }, [groupedCards, ungroupedCards]);

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

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Card"
        itemName={selectedCardName}
        isDeleting={isDeleting}
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
          
          <Button
            onClick={() => setCreateCardsDrawerOpen(true)}
            className="flex md:hidden mt-10"
          >
            Add your first credit card
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10'>
          {sortedItems.map((item, index) => {
            if (item.type === "group") {
              const isExpanded = expandedGroups.has(item.groupName);
              return (
                <React.Fragment key={`group-${item.groupName}`}>
                  <GroupCard
                    groupName={item.groupName}
                    totalBalance={item.totalBalance}
                    cardCount={item.cards.length}
                    isExpanded={isExpanded}
                    onToggleExpand={() => handleToggleExpand(item.groupName)}
                    onGroupClick={() => handleGroupClick(item.groupName)}
                  />
                  {isExpanded &&
                    item.cards.map((card) => (
                      <div key={card.id} className="md:col-start-1 md:pl-6">
                        <CreditCardCard
                          id={card.id}
                          name={card.name}
                          statementDate={card.statementDate}
                          dueDate={card.dueDate}
                          currentBalance={card.currentBalance}
                          onClick={() => handleCardClick(card.id)}
                          onEdit={() => handleEdit(card.id)}
                          onDelete={() => handleDelete(card.id, card.name)}
                        />
                      </div>
                    ))}
                </React.Fragment>
              );
            } else {
              return (
                <CreditCardCard
                  key={item.card.id}
                  id={item.card.id}
                  name={item.card.name}
                  statementDate={item.card.statementDate}
                  dueDate={item.card.dueDate}
                  currentBalance={item.card.currentBalance}
                  onClick={() => handleCardClick(item.card.id)}
                  onEdit={() => handleEdit(item.card.id)}
                  onDelete={() => handleDelete(item.card.id, item.card.name)}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  )
}

export default Cards