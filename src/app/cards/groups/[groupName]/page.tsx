"use client"

import { useParams, useRouter } from 'next/navigation';
import React from 'react'
import { useCardGroupQuery } from '@/hooks/useCardsQuery';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import CreditCardCard from '@/components/shared/CreditCardCard';
import SkeletonCardCard from '@/components/shared/SkeletonCardCard';

const CardGroupPage = () => {
  const params = useParams();
  const router = useRouter();
  const groupName = decodeURIComponent(params.groupName as string);
  
  const { cardGroupData, isFetching, error } = useCardGroupQuery(groupName);

  const formattedOutstandingBalance = cardGroupData
    ? Math.abs(cardGroupData.totalOutstandingBalance).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const formattedStatementBalance = cardGroupData?.totalStatementBalance !== null && cardGroupData?.totalStatementBalance !== undefined
    ? Math.abs(cardGroupData.totalStatementBalance).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  const statementDateFormatted = cardGroupData?.statementDate
    ? `${cardGroupData.statementDate}${getOrdinalSuffix(cardGroupData.statementDate)}`
    : null;

  const lastCalculationDate = cardGroupData?.lastStatementCalculationDate
    ? new Date(cardGroupData.lastStatementCalculationDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const handleCardClick = (cardId: string) => {
    router.push(`/cards/${cardId}`);
  };

  if (isFetching) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
        {/* Header Skeleton */}
        <div className="w-full rounded-xl p-6 md:p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border/50 shadow-lg mb-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-12 w-64 bg-muted animate-pulse rounded" />
        </div>

        {/* Statement Overview Skeleton */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="h-6 w-40 bg-muted animate-pulse rounded mb-2" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonCardCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl md:text-4xl font-semibold'>Failed to load card group</p>
            <p className='text-muted-foreground'>{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="mt-10"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!cardGroupData || cardGroupData.cards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.creditCardIcon
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl md:text-4xl font-semibold'>No cards found in this group</p>
            <p className='text-muted-foreground'>This card group doesn't exist or has no cards.</p>
          </div>
          <Button
            onClick={() => router.push('/cards')}
            className="mt-10"
          >
            Back to Cards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col gap-6">
      {/* Header Section with Outstanding Balance - Gradient Design */}
      <div className="w-full rounded-lg md:rounded-xl p-4 md:p-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
        {/* Mobile Layout - Stacked */}
        <div className="flex md:hidden flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Icons.creditCardIcon size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {groupName}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {cardGroupData.cards.length} {cardGroupData.cards.length === 1 ? 'card' : 'cards'}
              </p>
            </div>
          </div>
          
          <div className="flex items-baseline gap-1.5 pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground">PHP</span>
            <p className="text-2xl font-bold text-foreground">
              {formattedOutstandingBalance}
            </p>
          </div>
        </div>

        {/* Desktop Layout - Side by Side */}
        <div className="hidden md:flex md:items-center md:justify-between gap-6">
          {/* Left side - Group Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-xl shrink-0">
              <Icons.creditCardIcon size={24} className="text-primary" />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                {groupName}
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                {cardGroupData.cards.length} {cardGroupData.cards.length === 1 ? 'card' : 'cards'}
              </p>
            </div>
          </div>
          
          {/* Right side - Balance */}
          <div className="flex flex-col items-end">
            <p className="text-sm text-muted-foreground font-medium mb-1">
              Total Outstanding Balance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-base text-muted-foreground font-light">PHP</span>
              <p className="text-4xl font-bold text-foreground">
                {formattedOutstandingBalance}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statement Overview Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Statement Overview</h2>
        
        {formattedStatementBalance !== null ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statement Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg text-muted-foreground">₱</span>
                <p className="text-2xl md:text-3xl font-semibold">
                  {formattedStatementBalance}
                </p>
              </div>
              {lastCalculationDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  As of {lastCalculationDate}
                </p>
              )}
            </div>
            
            {statementDateFormatted && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Statement Date</p>
                <p className="text-base font-medium">{statementDateFormatted} of each month</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground">
            <p className="text-sm">
              Statement balance will be available after the next statement date.
            </p>
          </div>
        )}
      </div>

      {/* Individual Cards Grid */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-4">Cards in this group</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardGroupData.cards.map((card) => (
            <CreditCardCard
              key={card.id}
              name={card.name}
              statementDate={card.statementDate}
              dueDate={card.dueDate}
              currentBalance={card.currentBalance}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function for ordinal suffix
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default CardGroupPage;