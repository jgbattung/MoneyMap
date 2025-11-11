import React from 'react'
import { Icons } from '../icons';

interface BudgetCardProps {
  name: string;
  monthlyBudget?: string | null;
  spentAmount: number;
  onClick?: () => void,
}

const BudgetCard = ({ name, monthlyBudget, spentAmount, onClick }: BudgetCardProps) => {
  const budget = monthlyBudget ? parseFloat(monthlyBudget) : 0;

  const progressPercentage = budget > 0 ? (spentAmount / budget) * 100 : 0;
  const progressBarWidth = Math.min(progressPercentage, 100);

  const isOverBudget = budget > 0 && spentAmount > budget;
  const hasSpendingWithoutBudget = budget === 0 && spentAmount > 0;
  const isEmpty = budget === 0 && spentAmount === 0;

  let progressColor = 'bg-gray-400';
  if (hasSpendingWithoutBudget || isOverBudget) {
    progressColor = 'bg-error-500';
  } else if (spentAmount > 0 && !isOverBudget) {
    progressColor = 'bg-green-600';
  }

  let statusText = 'No budget set';
  if (budget > 0) {
    statusText = isOverBudget ? 'Over budget' : 'On budget';
  } else if (hasSpendingWithoutBudget) {
    statusText = 'Over budget';
  }

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-center gap-3'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icons.money size={20} className='text-primary' />
        </div>
        <h3 className='font-semibold text-lg truncate'>{name}</h3>
      </div>

      <div className='flex flex-col text-sm text-muted-foreground gap-2'>
        <p>Monthly budget: {budget > 0 ? `₱${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}</p>
        <p className='text-muted-foreground'>
          ₱{spentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent this month
        </p>
      </div>

      <div className='space-y-2'>
        {/* Progress Bar */}
        <div className='w-full bg-gray-400 rounded-full h-2'>
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
            style={{ 
              width: isEmpty ? '100%' : 
                    hasSpendingWithoutBudget ? '100%' : 
                    `${Math.max(progressBarWidth)}%`
            }}
          />
        </div>
        
        <div className='flex justify-between items-center text-sm'>
          <span>
          <span className='text-muted-foreground'>
            {budget > 0 ? `${progressPercentage.toFixed()}% of budget` : 'No budget set'}
          </span>
          </span>
          <span className={`font-medium ${
            isOverBudget || hasSpendingWithoutBudget ? 'text-error-600' : 
            budget > 0 ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
  )
}

export default BudgetCard