import React from 'react'
import { Icons } from '../icons'
import { capitalizeFirstLetter } from '@/lib/utils';

interface AccountCardProps {
  accountType: string;
  addToNetWorth: boolean;
  currentBalance: string;
  name: string;
  onClick?: () => void;
}

const AccountCard = ({ accountType, addToNetWorth, currentBalance, name, onClick }: AccountCardProps) => {
  const accountTypeFormatted = accountType
    .split('_')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
  const formattedBalance = parseFloat(currentBalance).toLocaleString('en-PH', {
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
            <Icons.bank size={20} className='text-primary' />
          </div>
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
          {addToNetWorth && (
            <Icons.addToNetWorth size={16} className='text-accent-500' />
          )}
        </div>
      <p className='text-muted-foreground text-xs font-bold'>{accountTypeFormatted}</p>
      </div>
      <div className='flex flex-col items-end'>
        <div className='flex items-end justify-center gap-2'>
          <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
          <p className='text-foreground md:text-md lg:text-lg'>{formattedBalance}</p>
        </div>
        <p className='text-muted-foreground text-xs'>Balance</p>
      </div>
    </div>
  )
}

export default AccountCard