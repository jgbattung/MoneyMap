"use client"

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Icons } from '../icons'
import { Badge } from '../ui/badge'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

interface ExpenseCardProps {
  id: string;
  name: string;
  amount: string;
  date: string;
  description?: string | null;
  account: {
    id: string;
    name: string;
  };
  expenseType: {
    id: string;
    name: string;
  };
  isInstallment: boolean;
  installmentDuration?: number | null;
  remainingInstallments?: number | null;
  installmentStartDate?: string | null;
  monthlyAmount?: string | null;
  onClick?: () => void;
}

const ExpenseCard = ({
  name,
  amount,
  date,
  account,
  expenseType,
  isInstallment,
  installmentDuration,
  remainingInstallments,
  installmentStartDate,
  monthlyAmount,
  onClick,
}: ExpenseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAmount = parseFloat(amount);
  const monthly = monthlyAmount ? parseFloat(monthlyAmount) : null;
  
  const formattedAmount = totalAmount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formattedMonthly = monthly?.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const displayDate = isInstallment && installmentStartDate 
    ? format(new Date(installmentStartDate), 'MMM d, yyyy')
    : format(new Date(date), 'MMM d, yyyy');

  const paidInstallments = installmentDuration && remainingInstallments 
    ? installmentDuration - remainingInstallments 
    : 0;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
        <div className='flex items-center gap-2'>
          <div className='p-2 bg-primary/10 rounded-lg'>
            <Icons.addExpense size={20} className='text-primary' />
          </div>
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
        </div>

        {isInstallment && (
          <Badge variant="secondary" className="text-xs">
            Installment
          </Badge>
        )}
        <p className='text-muted-foreground text-xs font-bold'>{expenseType.name}</p>

      <div className='flex items-end justify-between'>
        {/* Left side: Expand button (only for installments) */}
        {isInstallment && (
          <div className='flex items-center justify-center'>
            <button
              onClick={handleExpandClick}
              className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
            >
              <span>Installment details</span>
              {isExpanded ? (
                <ChevronUpIcon size={14} />
              ) : (
                <ChevronDownIcon size={14} />
              )}
            </button>
          </div>
        )}

        {/* Right side: Amount and account */}
        <div className='flex flex-col items-end ml-auto'>
          <div className='flex items-end justify-center gap-2'>
            <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
            <p className='text-foreground md:text-md lg:text-lg'>
              {isInstallment ? formattedMonthly : formattedAmount}
            </p>
          </div>
          <p className='text-muted-foreground text-xs mt-1'>{account.name}</p>
        </div>
      </div>

      {isInstallment && isExpanded && (
        <div className='mt-2 p-3 bg-neutral-800 rounded-md space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Start Date:</span>
            <span className='font-medium'>{displayDate}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Installment:</span>
            <span className='font-medium'>
              {paidInstallments + 1}/{installmentDuration}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Installment duration:</span>
            <span className='font-medium'>{remainingInstallments} months</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Total Amount:</span>
            <span className='font-medium'>₱{formattedAmount}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseCard