"use client"

import React from 'react';
import { useBudgetStatus } from '@/hooks/useBudgetStatus';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface BudgetStatusItemProps {
  name: string;
  monthlyBudget: number | null;
  spentAmount: number;
  progressPercentage: number;
  isOverBudget: boolean;
}

const BudgetStatusItem = ({ 
  name, 
  monthlyBudget, 
  spentAmount, 
  progressPercentage,
  isOverBudget 
}: BudgetStatusItemProps) => {
  const hasNoBudget = monthlyBudget === null || monthlyBudget === 0;
  const hasSpendingWithoutBudget = hasNoBudget && spentAmount > 0;
  
  // Progress bar color logic
  let progressColor = 'bg-gray-400';
  if (hasSpendingWithoutBudget || isOverBudget) {
    progressColor = 'bg-error-500';
  } else if (spentAmount > 0 && !isOverBudget) {
    progressColor = 'bg-green-600';
  }

  const progressWidth = hasNoBudget ? 100 : Math.min(progressPercentage, 100);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm">{name}</span>
        
        <div className="text-right">
          <div className="font-semibold text-sm">
            ₱{formatCurrency(spentAmount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {hasNoBudget 
              ? 'No budget set' 
              : `out of ₱${formatCurrency(monthlyBudget)}`
            }
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-400/30 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
};

const SkeletonBudgetList = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24 bg-secondary-500" />
          <Skeleton className="h-4 w-20 bg-secondary-500" />
        </div>
        <Skeleton className="h-2 w-full bg-secondary-500" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-muted-foreground">No budget activity this month</p>
    <p className="text-xs text-muted-foreground mt-1">
      Start tracking by adding budgets and expenses
    </p>
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-error-600 font-semibold">Failed to load budget status</p>
    <p className="text-xs text-muted-foreground mt-1">{error}</p>
  </div>
);

const BudgetStatus = () => {
  const { budgets, isLoading, error } = useBudgetStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Budget Status</h2>
        <span className="text-xs text-muted-foreground">This Month</span>
      </div>

      {isLoading && <SkeletonBudgetList />}

      {!isLoading && error && <ErrorState error={error} />}

      {!isLoading && !error && budgets.length === 0 && <EmptyState />}

      {!isLoading && !error && budgets.length > 0 && (
        <>
          <div className="space-y-3">
            {budgets.map(budget => (
              <BudgetStatusItem key={budget.id} {...budget} />
            ))}
          </div>

          <div className="pt-3 border-t border-border">
            <Link href="/budgets">
              <Button variant="outline" className="w-full">
                See All Budgets
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetStatus;