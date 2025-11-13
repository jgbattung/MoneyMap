"use client"

import React from 'react'
import { format } from 'date-fns'
import { Icons } from '../icons'

interface IncomeCardProps {
  id: string;
  name: string;
  amount: string;
  date: string;
  description?: string | null;
  account: {
    id: string;
    name: string;
  };
  incomeType: {
    id: string;
    name: string;
  };
  onClick?: () => void;
}

const IncomeCard = ({
  name,
  amount,
  date,
  account,
  incomeType,
  onClick,
}: IncomeCardProps) => {
  const totalAmount = parseFloat(amount);
  
  const formattedAmount = totalAmount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const displayDate = format(new Date(date), 'MMM d, yyyy');

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-center gap-2'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icons.addIncome size={20} className='text-primary' />
        </div>
        <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
      </div>

      <p className='text-muted-foreground text-xs font-bold'>{incomeType.name}</p>

      <div className='flex items-end justify-between'>
        <p className='text-muted-foreground text-xs'>{displayDate}</p>

        <div className='flex flex-col items-end'>
          <div className='flex items-end justify-center gap-2'>
            <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
            <p className='text-foreground md:text-md lg:text-lg'>
              {formattedAmount}
            </p>
          </div>
          <p className='text-muted-foreground text-xs mt-1'>{account.name}</p>
        </div>
      </div>
    </div>
  )
}

export default IncomeCard