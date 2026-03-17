// app/transactions/components/CompactTransactionCard.tsx

import React from 'react';
import { IconArrowDown, IconArrowUp, IconArrowRight } from '@tabler/icons-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

interface CompactTransactionCardProps {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  category: string;
  account: string;
  toAccount?: string;
  subcategory?: string | null;
  tags?: { id: string; name: string; color: string }[];
  onClick: () => void;
}

const CompactTransactionCard = ({
  type,
  name,
  amount,
  date,
  category,
  account,
  toAccount,
  subcategory,
  tags,
  onClick,
}: CompactTransactionCardProps) => {
  const getIcon = () => {
    switch (type) {
      case 'EXPENSE':
        return <IconArrowDown className="h-4 w-4" />;
      case 'INCOME':
        return <IconArrowUp className="h-4 w-4" />;
      case 'TRANSFER':
        return <IconArrowRight className="h-4 w-4" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'EXPENSE':
        return 'bg-text-error/20';
      case 'INCOME':
        return 'bg-text-success/20';
      case 'TRANSFER':
        return 'bg-neutral-500/20';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'EXPENSE':
        return 'text-text-error';
      case 'INCOME':
        return 'text-text-success';
      case 'TRANSFER':
        return 'text-neutral-400';
    }
  };

  const getAmountColor = () => {
    switch (type) {
      case 'EXPENSE':
        return 'text-text-error';
      case 'INCOME':
        return 'text-text-success';
      case 'TRANSFER':
        return 'text-neutral-400';
    }
  };

  const formattedAmount = amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formattedDate = format(new Date(date), 'MMM d');

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-card/70 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-md ${getIconBgColor()} ${getIconColor()} flex-shrink-0`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground text-sm truncate">{name}</h3>
            <span className={`font-semibold text-sm flex-shrink-0 ${getAmountColor()}`}>
              ₱{formattedAmount}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1 text-xs">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-muted-foreground truncate">
                {subcategory ? `${category} > ${subcategory}` : category}
              </span>
              <span className="text-muted-foreground/80 truncate">
                {toAccount ? `${account} → ${toAccount}` : account}
              </span>
            </div>
            <span className="text-muted-foreground/80 flex-shrink-0 ml-2">{formattedDate}</span>
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 gap-1"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactTransactionCard;