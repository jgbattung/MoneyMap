import React from 'react'
import { Icons } from '../icons';

interface IncomeTypeCardProps {
  name: string;
  monthlyTarget?: string | null;
  onClick?: () => void,
}

const IncomeTypeCard = ({ name, monthlyTarget, onClick }: IncomeTypeCardProps) => {
  const targetAmount = monthlyTarget ? parseFloat(monthlyTarget) : 0;

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-center gap-3'>
        <div className='p-2 bg-primary/10 rounded-lg'>
          <Icons.addIncome size={20} className='text-primary' />
        </div>
        <h3 className='font-semibold text-lg truncate'>{name}</h3>
      </div>

      <div className='text-sm text-muted-foreground'>
        Monthly target: {targetAmount > 0 ? `₱${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not set'}
      </div>

      <div className='space-y-2'>
        <div className='flex justify-between items-center text-sm'>
          <span className='text-muted-foreground'>
            ₱0.00 earned this month
          </span>
          <span className={`font-medium ${
            targetAmount > 0 ? 'text-muted-foreground' : 'text-muted-foreground'
          }`}>
            {targetAmount > 0 ? '0% of target' : 'No target set'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default IncomeTypeCard