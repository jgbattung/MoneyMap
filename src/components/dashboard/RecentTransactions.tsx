"use client"

import React from 'react';
import { useRecentTransactions, TransactionType } from '@/hooks/useRecentTransactions';
import { Button } from '@/components/ui/button';
import { IconArrowDown, IconArrowUp, IconArrowRight } from '@tabler/icons-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

const RecentTransactions = () => {
  const { transactions, isLoading, error } = useRecentTransactions();

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'EXPENSE':
        return <IconArrowDown className="h-4 w-4" />;
      case 'INCOME':
        return <IconArrowUp className="h-4 w-4" />;
      case 'TRANSFER':
        return <IconArrowRight className="h-4 w-4" />;
    }
  };

  const getIconBgColor = (type: TransactionType) => {
    switch (type) {
      case 'EXPENSE':
        return 'bg-red-500/20';
      case 'INCOME':
        return 'bg-green-500/20';
      case 'TRANSFER':
        return 'bg-muted';
    }
  };

  const getIconColor = (type: TransactionType) => {
    switch (type) {
      case 'EXPENSE':
        return 'text-red-500';
      case 'INCOME':
        return 'text-green-500';
      case 'TRANSFER':
        return 'text-muted-foreground';
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case 'EXPENSE':
        return 'text-red-500';
      case 'INCOME':
        return 'text-green-500';
      case 'TRANSFER':
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-center py-8'>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col items-center justify-center py-8 text-center'>
          <p className='text-error-600 font-semibold'>Failed to load recent transactions</p>
          <p className='text-muted-foreground text-sm mt-2'>{error}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className='flex flex-col gap-3'>
        <p className='text-foreground font-semibold text-sm md:text-base'>Recent Transactions</p>
        <div className='flex flex-col items-center justify-center py-8 text-center'>
          <p className='text-muted-foreground'>No transactions yet</p>
          <p className='text-muted-foreground text-sm mt-2'>
            Start tracking your finances by creating your first transaction
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-foreground font-semibold text-sm md:text-base'>Recent Transactions</p>

      <div className='flex flex-col gap-3'>
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${getIconBgColor(transaction.type)}`}>
                <span className={getIconColor(transaction.type)}>
                  {getTransactionIcon(transaction.type)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {transaction.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {transaction.type === 'TRANSFER' 
                    ? `${transaction.accountName} → ${transaction.toAccountName}`
                    : transaction.accountName
                  }
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className={`text-sm font-semibold ${getAmountColor(transaction.type)}`}>
                ₱{formatCurrency(transaction.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-border">
        <Link href="/transactions">
          <Button variant="outline" className="w-full">
            See All
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default RecentTransactions;