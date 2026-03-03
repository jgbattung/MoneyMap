import React from 'react'
import { Icons } from '../icons'
import { capitalizeFirstLetter } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AccountCardProps {
  id: string;
  accountType: string;
  addToNetWorth: boolean;
  currentBalance: string;
  name: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const AccountCard = ({ 
  id,
  accountType, 
  addToNetWorth, 
  currentBalance, 
  name, 
  onEdit,
  onDelete 
}: AccountCardProps) => {
  const router = useRouter();

  const accountTypeFormatted = accountType
    .split('_')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
  const formattedBalance = parseFloat(currentBalance).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const handleCardClick = () => {
    router.push(`/accounts/${id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div
      className='flex flex-col gap-3 bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105 transition-all duration-200 cursor-pointer relative'
      onClick={handleCardClick}
    >
      {/* Ellipsis Menu */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger 
          className='absolute top-2 right-2 p-1 hover:bg-secondary-500 hover:transition-all rounded-sm'
          onClick={(e) => e.stopPropagation()}
        >
          <Icons.ellipsis size={16} className='text-muted-foreground' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleEdit}
            className='cursor-pointer focus:bg-secondary-500 focus:text-foreground'
          >
            <Icons.edit size={16} className='mr-2' />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDelete}
            className='cursor-pointer focus:bg-secondary-500 focus:text-foreground'
          >
            <Icons.trash size={16} className='mr-2 text-error-600' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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