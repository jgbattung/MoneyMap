import React from 'react'
import { Icons } from '../icons'
import { capitalizeFirstLetter } from '@/lib/utils';

interface AccountCardProps {
  accountType: string;
  addToNetWorth: boolean;
  currentBalance: string;
  name: string;
}

const AccountCard = ({ accountType, addToNetWorth, currentBalance, name }: AccountCardProps) => {
  const accountTypeFormatted = capitalizeFirstLetter(accountType);
  const formattedBalance = parseFloat(currentBalance).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md'>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center gap-2'>
          <Icons.accountIcon size={22} className='text-foreground' />
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
        </div>
        <div className='w-fit px-3 py-1.5 bg-primary-800 rounded-2xl'>
          <p className='text-white text-xs'>{accountTypeFormatted}</p>
        </div>
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