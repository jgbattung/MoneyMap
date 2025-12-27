import { useQuery } from '@tanstack/react-query';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface RecentTransaction {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  toAccountId?: string;
  toAccountName?: string;
}

interface RecentTransactionsResponse {
  transactions: RecentTransaction[];
}

const QUERY_KEYS = {
  recentTransactions: ['recentTransactions'] as const,
};

const fetchRecentTransactions = async (): Promise<RecentTransaction[]> => {
  const response = await fetch('/api/transactions/recent');
  if (!response.ok) throw new Error('Failed to fetch recent transactions');
  const data: RecentTransactionsResponse = await response.json();
  return data.transactions;
};

export const useRecentTransactions = () => {
  const {
    data: transactions = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.recentTransactions,
    queryFn: fetchRecentTransactions,
    staleTime: 1 * 60 * 1000,
  });

  return {
    transactions,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
  };
};