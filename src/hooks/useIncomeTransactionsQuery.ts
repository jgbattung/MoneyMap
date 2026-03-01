import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type IncomeTransaction = {
  id: string;
  userId: string;
  accountId: string;
  incomeTypeId: string;
  name: string;
  amount: string;
  date: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
  };
  incomeType: {
    id: string;
    name: string;
  };
}

type IncomeTransactionsResponse = {
  transactions: IncomeTransaction[];
  total: number;
  hasMore: boolean;
}

interface UseIncomeTransactionsOptions {
  skip?: number;
  take?: number;
  search?: string;
  dateFilter?: string;
  accountId?: string;
}

const QUERY_KEYS = {
  incomeTransactions: ['incomeTransactions'] as const,
  incomeTransaction: (id: string) => ['incomeTransactions', id] as const,
}

const fetchIncomeTransactions = async (
  skip?: number,
  take?: number,
  search?: string,
  dateFilter?: string,
  accountId?: string
): Promise<IncomeTransactionsResponse> => {
  const params = new URLSearchParams();
  if (skip !== undefined) params.append('skip', skip.toString());
  if (take !== undefined) params.append('take', take.toString());
  if (search) params.append('search', search);
  if (dateFilter && dateFilter !== 'view-all') params.append('dateFilter', dateFilter);
  if (accountId) params.append('accountId', accountId);
  
  const url = `/api/income-transactions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch income transactions');
  return response.json();
}

const createIncomeTransaction = async (incomeTransactionData: any): Promise<IncomeTransaction> => {
  const response = await fetch('/api/income-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(incomeTransactionData),
  });
  if (!response.ok) throw new Error('Failed to create income transaction');
  return response.json();
};

const updateIncomeTransaction = async ({ id, ...incomeTransactionData }: any): Promise<IncomeTransaction> => {
  const response = await fetch(`/api/income-transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(incomeTransactionData),
  });
  if (!response.ok) throw new Error('Failed to update income transaction');
  return response.json();
}

const deleteIncomeTransaction = async (id: string): Promise<void> => {
  const response = await fetch(`/api/income-transactions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to income transfer transaction')
  }
}

export const useIncomeTransactionsQuery = (options: UseIncomeTransactionsOptions = {}) => {
  const { skip, take, search, dateFilter, accountId } = options;
  const queryClient = useQueryClient();

  const {
    data,
    isPending,
    error,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.incomeTransactions, 
      { skip, take, search, dateFilter, accountId  }
    ],
    queryFn: () => fetchIncomeTransactions(skip, take, search, dateFilter, accountId),
    staleTime: 5 * 60 * 1000,
  });

  const createIncomeTransactionMutation = useMutation({
    mutationFn: createIncomeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['incomeBreakdown'] });
    },
  });

  const updateIncomeTransactionMutation = useMutation({
    mutationFn: updateIncomeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['incomeBreakdown'] });
    },
  });

  const deleteIncomeTransactionMutation = useMutation({
    mutationFn: deleteIncomeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['incomeBreakdown'] });
    }
  })

  return {
    // Return transactions array for backward compatibility
    incomeTransactions: data?.transactions || [],
    // Add new metadata fields
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createIncomeTransaction: createIncomeTransactionMutation.mutateAsync,
    updateIncomeTransaction: updateIncomeTransactionMutation.mutateAsync,
    deleteIncomeTransaction: deleteIncomeTransactionMutation.mutateAsync,
    isCreating: createIncomeTransactionMutation.isPending,
    isUpdating: updateIncomeTransactionMutation.isPending,
    isDeleting: deleteIncomeTransactionMutation.isPending,
  };
};

const fetchIncomeTransaction = async (id: string): Promise<IncomeTransaction> => {
  const response = await fetch(`/api/income-transactions/${id}`);
  if (!response.ok) throw new Error('Failed to fetch income transaction');
  return response.json();
}

export const useIncomeTransactionQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.incomeTransaction(id),
    queryFn: () => fetchIncomeTransaction(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    incomeTransactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}