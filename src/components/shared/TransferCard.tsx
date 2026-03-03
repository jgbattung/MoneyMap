"use client"

import React from 'react'
import { format } from 'date-fns'
import { Icons } from '../icons'
import { ArrowRight } from 'lucide-react'

type TransferCardProps = {
  id: string;
  name: string;
  amount: number;
  date: string;
  fromAccount: {
    id: string;
    name: string;
  };
  toAccount: {
    id: string;
    name: string;
  };
  transferType: {
    id: string;
    name: string;
  };
  onClick: () => void;
}

const TransferCard = ({
  name,
  amount,
  date,
  fromAccount,
  toAccount,
  transferType,
  onClick,
}: TransferCardProps) => {
  const formattedAmount = amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <div className='p-2 bg-primary/10 rounded-lg'>
            <Icons.addTransfer size={20} className='text-primary' />
          </div>
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
        </div>
        <p className='text-muted-foreground text-xs font-bold'>{transferType.name}</p>
        <p className='text-muted-foreground text-xs'>{format(new Date(date), 'MMM d, yyyy')}</p>
      </div>
      <div className='flex flex-col items-end'>
        <div className='flex items-end justify-center gap-2'>
          <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
          <p className='text-foreground md:text-md lg:text-lg'>{formattedAmount}</p>
        </div>
        <div className='flex items-center gap-2 text-foreground font-medium text-xs mt-1'>
          {fromAccount.name}
          <ArrowRight size={12} />
          {toAccount.name}
        </div>
      </div>
    </div>
  )
}

export default TransferCard