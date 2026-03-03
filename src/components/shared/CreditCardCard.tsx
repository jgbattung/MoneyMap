import { getOrdinalSuffix } from "@/lib/utils";
import { Icons } from "../icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from "react";

interface CreditCardCardProps {
  id: string;
  currentBalance: string;
  name: string;
  statementDate?: number;
  dueDate?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CreditCardCard = ({
  id: _id,
  currentBalance, 
  name, 
  statementDate, 
  dueDate, 
  onClick,
  onEdit,
  onDelete 
}: CreditCardCardProps) => {
  // Banking convention: negate the DB value
  // DB: -25000 (debt) → Display: 25000
  // DB: +500 (credit) → Display: -500
  const dbBalance = parseFloat(currentBalance);
  const displayBalance = dbBalance === 0 ? 0 : -dbBalance;
  
  const formattedBalance = displayBalance.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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
      onClick={onClick}
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
            <Icons.creditCardIcon size={20} className='text-primary' />
          </div>
          <p className='text-foreground font-bold md:text-lg lg:text-xl'>{name}</p>
        </div>
        <div className="text-muted-foreground text-xs space-y-0.5">
          {statementDate && (
            <p>{`Statement date every ${statementDate}${getOrdinalSuffix(statementDate)} of the month.`}</p>
          )}
          {dueDate && (
            <p>{`Due date every ${dueDate}${getOrdinalSuffix(dueDate)} of the month.`}</p>
          )}
        </div>
      </div>
      <div className='flex flex-col items-end'>
        <div className='flex items-end justify-center gap-2'>
          <span className='text-muted-foreground font-light text-xs md:text-md'>PHP</span>
          <p className='text-foreground md:text-md lg:text-lg'>{formattedBalance}</p>
        </div>
        <p className='text-muted-foreground text-xs'>Outstanding balance</p>
      </div>
    </div>
  )
}

export default CreditCardCard