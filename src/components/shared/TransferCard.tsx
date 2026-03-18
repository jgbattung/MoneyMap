"use client"

import React from 'react'
import { format } from 'date-fns'
import { Icons } from '../icons'
import { ArrowRight } from 'lucide-react'
import { Badge } from '../ui/badge'

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
  tags?: { id: string; name: string; color: string }[];
  onClick: () => void;
}

const TransferCard = ({
  name,
  amount,
  date,
  fromAccount,
  toAccount,
  transferType,
  tags,
  onClick,
}: TransferCardProps) => {
  const formattedAmount = amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div
      className='money-map-card-interactive flex flex-col gap-3 cursor-pointer'
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
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs px-2 py-0 h-5 gap-1"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground self-center">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}
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