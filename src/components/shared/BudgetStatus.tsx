"use client"

import React from 'react';
import { useBudgetStatus } from '@/hooks/useBudgetStatus';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface BudgetStatusItemProps {
  name: string;
  monthlyBudget: number | null;
  spentAmount: number;
  progressPercentage: number;
  isOverBudget: boolean;
  prefersReducedMotion: boolean;
}

const BudgetStatusItem = ({
  name,
  monthlyBudget,
  spentAmount,
  progressPercentage,
  isOverBudget,
  prefersReducedMotion,
}: BudgetStatusItemProps) => {
  const hasNoBudget = monthlyBudget === null || monthlyBudget === 0;
  const hasSpendingWithoutBudget = hasNoBudget && spentAmount > 0;
  
  // Progress bar color logic
  let progressColor = 'bg-secondary-400';
  if (hasSpendingWithoutBudget || isOverBudget) {
    progressColor = 'bg-text-error';
  } else if (spentAmount > 0 && !isOverBudget && progressPercentage >= 80) {
    progressColor = 'bg-amber-400';
  } else if (spentAmount > 0 && !isOverBudget) {
    progressColor = 'bg-text-success';
  }

  const progressWidth = hasNoBudget ? 100 : Math.min(progressPercentage, 100);

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
          {!hasNoBudget && (
            <div className="text-xs text-muted-foreground">
              {progressPercentage}%
            </div>
          )}
        </div>
      </div>

      <div className="w-full bg-secondary-400/30 rounded-full h-2">
        {prefersReducedMotion ? (
          <div
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${progressWidth}%` }}
          />
        ) : (
          <motion.div
            className={`h-2 rounded-full ${progressColor}`}
            initial={{ width: "0%" }}
            animate={{ width: `${progressWidth}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
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

const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <AlertCircle className="h-8 w-8 text-error-600 mx-auto mb-2" />
    <p className="text-sm text-error-600 font-semibold">Failed to load budget status</p>
    <p className="text-xs text-muted-foreground mt-1">{error}</p>
    <button
      onClick={onRetry}
      className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-3"
    >
      Try again
    </button>
  </div>
);

const BudgetStatus = () => {
  const { budgets, isLoading, error, refetch } = useBudgetStatus();
  const prefersReducedMotion = !!useReducedMotion();

  const onTrackCount = budgets.filter(b => !b.isOverBudget && b.monthlyBudget !== null && b.monthlyBudget > 0).length;
  const totalCount = budgets.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold text-sm md:text-base">Budget Status</h2>
        <span className="text-xs text-muted-foreground">This Month</span>
      </div>

      {!isLoading && !error && budgets.length > 0 && (
        <p className="text-xs text-muted-foreground">{onTrackCount} of {totalCount} budgets on track</p>
      )}

      {isLoading && <SkeletonBudgetList />}

      {!isLoading && error && <ErrorState error={error} onRetry={() => refetch()} />}

      {!isLoading && !error && budgets.length === 0 && <EmptyState />}

      {!isLoading && !error && budgets.length > 0 && (
        <>
          <div className="space-y-3">
            {budgets.map(budget => (
              <BudgetStatusItem key={budget.id} {...budget} prefersReducedMotion={prefersReducedMotion} />
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

export { BudgetStatus };