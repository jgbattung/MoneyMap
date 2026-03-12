"use client"

import React from 'react';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';

const formatAccountType = (type: string): string => {
  const typeMap: Record<string, string> = {
    CHECKING: "Checking",
    SAVINGS: "Savings",
    INVESTMENT: "Investment",
    CASH: "Cash",
    CRYPTO: "Crypto",
    RETIREMENT: "Retirement",
    REAL_ESTATE: "Real Estate",
    PAYROLL: "Payroll",
    E_WALLET: "E-Wallet",
    OTHER: "Other",
  };
  return typeMap[type] || type;
};

interface AccountItemProps {
  name: string;
  accountType: string;
  balance: number;
}

const AccountItem = ({ name, accountType, balance }: AccountItemProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">
          {formatAccountType(accountType)}
        </span>
      </div>

      <div className="font-semibold text-sm">
        ₱{formatCurrency(balance)}
      </div>
    </div>
  );
};

interface CreditCardItemProps {
  name: string;
  balance: number;
}

const CreditCardItem = ({ name, balance }: CreditCardItemProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">Credit Card</span>
      </div>

      <div className="font-semibold text-sm text-foreground">
        ₱{formatCurrency(balance)}
      </div>
    </div>
  );
};

const SkeletonList = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-32 bg-secondary-500" />
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24 bg-secondary-500" />
            <Skeleton className="h-3 w-16 bg-secondary-500" />
          </div>
          <Skeleton className="h-4 w-20 bg-secondary-500" />
        </div>
      ))}
    </div>
    <Skeleton className="h-10 w-full bg-secondary-500" />
  </div>
);

interface EmptyStateProps {
  type: 'accounts' | 'cards';
}

const EmptyState = ({ type }: EmptyStateProps) => {
  const isAccounts = type === 'accounts';
  const Icon = isAccounts ? Wallet : CreditCard;

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        {isAccounts ? 'No accounts yet' : 'No credit cards yet'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {isAccounts
          ? 'Add your first account to start tracking'
          : 'Add your first credit card to track debt'
        }
      </p>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  type: 'accounts' | 'cards';
  onRetry: () => void;
}

const ErrorState = ({ error, type, onRetry }: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center py-8 text-center gap-1">
    <AlertCircle className="h-8 w-8 text-error-600" />
    <p className="text-error-600 font-semibold">
      Failed to load {type === 'accounts' ? 'accounts' : 'credit cards'}
    </p>
    <p className="text-muted-foreground text-sm">{error}</p>
    <button
      onClick={onRetry}
      className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1"
    >
      Try again
    </button>
  </div>
);

const TopAccounts = () => {
  const { accounts, isLoading, error, refetch } = useAccountsQuery();

  const topAccounts = accounts
    .sort((a, b) => parseFloat(b.currentBalance.toString()) - parseFloat(a.currentBalance.toString()))
    .slice(0, 5);

  if (isLoading) {
    return <SkeletonList />;
  }

  if (error) {
    return <ErrorState error={error} type="accounts" onRetry={refetch} />;
  }

  if (accounts.length === 0) {
    return <EmptyState type="accounts" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Accounts</h2>

      <div className="space-y-3">
        {topAccounts.map(account => (
          <AccountItem
            key={account.id}
            name={account.name}
            accountType={account.accountType}
            balance={parseFloat(account.currentBalance.toString())}
          />
        ))}
      </div>

      <Button variant="outline" asChild className="w-full hover:text-white">
        <Link href="/accounts">See All Accounts</Link>
      </Button>
    </div>
  );
};

const TopCreditCards = () => {
  const { cards, isLoading, error, refetch } = useCardsQuery();

  const topCards = cards
    .sort((a, b) => {
      // Sort by absolute value to show highest debt first
      const balanceA = Math.abs(parseFloat(a.currentBalance.toString()));
      const balanceB = Math.abs(parseFloat(b.currentBalance.toString()));
      return balanceB - balanceA;
    })
    .slice(0, 5);

  if (isLoading) {
    return <SkeletonList />;
  }

  if (error) {
    return <ErrorState error={error} type="cards" onRetry={refetch} />;
  }

  if (cards.length === 0) {
    return <EmptyState type="cards" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Credit Cards</h2>

      <div className="space-y-3">
        {topCards.map(card => {
          const dbBalance = parseFloat(card.currentBalance.toString());
          const displayBalance = -dbBalance;
          
          return (
            <CreditCardItem
              key={card.id}
              name={card.name}
              balance={displayBalance}
            />
          );
        })}
      </div>

      <Button variant="outline" asChild className="w-full hover:text-white">
        <Link href="/cards">See All Cards</Link>
      </Button>
    </div>
  );
};

const AccountsSummary = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="money-map-card">
        <TopAccounts />
      </div>

      <div className="money-map-card">
        <TopCreditCards />
      </div>
    </div>
  );
};

export { AccountsSummary };