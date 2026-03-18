"use client"

import React from 'react'
import { format } from 'date-fns'
import { Icons } from '../icons'
import { Badge } from '../ui/badge'

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
  tags?: { id: string; name: string; color: string }[];
  onClick?: () => void;
}

const IncomeCard = ({
  name,
  amount,
  date,
  account,
  incomeType,
  tags,
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
      className='money-map-card-interactive flex flex-col gap-3 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-center gap-2'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icons.addIncome size={20} className='text-primary' />
        </div>
        <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
      </div>

      <p className='text-muted-foreground text-xs font-bold'>{incomeType.name}</p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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