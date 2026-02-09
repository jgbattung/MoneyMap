"use client"

import { useParams, useRouter } from 'next/navigation';
import React from 'react'
import { useCardQuery } from '@/hooks/useCardsQuery';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import ExpenseTable from '@/components/tables/expenses/ExpenseTable';
import TransferTable from '@/components/tables/transfers/TransferTable';
import TransactionsMobileView from '@/components/transactions/TransactionsMobileView';


const CardDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;
  
  const { cardData, isFetching, error } = useCardQuery(cardId);

  const formattedOutstandingBalance = cardData
    ? Math.abs(parseFloat(cardData.currentBalance)).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const formattedStatementBalance = cardData?.statementBalance
    ? Math.abs(parseFloat(cardData.statementBalance)).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  const statementDateFormatted = cardData?.statementDate
    ? `${cardData.statementDate}${getOrdinalSuffix(cardData.statementDate)}`
    : null;

  const lastCalculationDate = cardData?.lastStatementCalculationDate
    ? new Date(cardData.lastStatementCalculationDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  if (isFetching) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
        {/* Header Skeleton */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border rounded-lg md:rounded-xl p-4 md:p-8 shadow-sm">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
            <div className="h-12 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Statement Overview Skeleton */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="h-6 w-40 bg-muted animate-pulse rounded mb-2" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>

        {/* Tables Skeleton */}
        <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.error
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl md:text-4xl font-semibold'>Failed to load card</p>
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

  if (!cardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.creditCardIcon
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl md:text-4xl font-semibold'>Card not found</p>
            <p className='text-muted-foreground'>This card doesn&apos;t exist or has been deleted.</p>
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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      {/* Header Section with Outstanding Balance - Gradient Design */}
      <div className="mb-6 md:mb-8">
        <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border rounded-lg md:rounded-xl p-4 md:p-8 shadow-sm hover:shadow-md transition-shadow">
          {/* Mobile Layout - Stacked */}
          <div className="flex md:hidden flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Icons.creditCardIcon size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {cardData.name}
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Credit Card
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
            {/* Left side - Card Info */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-xl shrink-0">
                <Icons.creditCardIcon size={24} className="text-primary" />
              </div>
              
              <div className="space-y-1">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                  {cardData.name}
                </h1>
                <p className="text-base text-muted-foreground font-medium">
                  Credit Card
                </p>
              </div>
            </div>
            
            {/* Right side - Balance */}
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Outstanding Balance
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
      </div>

      {/* Statement Overview Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Statement Overview</h2>
        
        {formattedStatementBalance !== null ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statement Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg text-muted-foreground">PHP</span>
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

      {/* Desktop View - Two Tables (Expenses and Transfers only) */}
      <div className="hidden md:block">
        <div className="space-y-8">
          {/* Expenses Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold md:text-2xl">Expenses</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Expense transactions for this card
              </p>
            </div>
            <ExpenseTable accountId={cardId} />
          </section>

          {/* Transfers Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold md:text-2xl">Transfers</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Transfer transactions for this card (including payments)
              </p>
            </div>
            <TransferTable accountId={cardId} />
          </section>
        </div>
      </div>

      {/* Mobile View - Tabs */}
      <div className="block md:hidden">
        <TransactionsMobileView accountId={cardId} />
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

export default CardDetailPage