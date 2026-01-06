import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ExpenseTransaction = {
  id: string;
  userId: string;
  accountId: string;
  expenseTypeId: string;
  expenseSubcategoryId?: string | null;
  name: string;
  amount: string;
  date: string;
  description?: string | null;
  isInstallment: boolean;
  installmentDuration?: number | null;
  remainingInstallments?: number | null;
  installmentStartDate?: string | null;
  monthlyAmount?: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
  };
  expenseType: {
    id: string;
    name: string;
  };
  expenseSubcategory?: {
    id: string;
    name: string;
  } | null;
}

type ExpenseTransactionsResponse = {
  transactions: ExpenseTransaction[];
  total: number;
  hasMore: boolean;
}

const QUERY_KEYS = {
  expenseTransactions: ['expenseTransactions'] as const,
  expenseTransaction: (id: string) => ['expenseTransactions', id] as const,
}

const fetchExpenseTransactions = async (
  skip?: number, 
  take?: number,
  search?: string,
  dateFilter?: string
): Promise<ExpenseTransactionsResponse> => {
  const params = new URLSearchParams();
  if (skip !== undefined) params.append('skip', skip.toString());
  if (take !== undefined) params.append('take', take.toString());
  if (search) params.append('search', search);
  if (dateFilter && dateFilter !== 'view-all') params.append('dateFilter', dateFilter);
  
  const url = `/api/expense-transactions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch expense transactions');
  return response.json();
}

const createExpenseTransaction = async (expenseTransactionData: any): Promise<ExpenseTransaction> => {
  const response = await fetch('/api/expense-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(expenseTransactionData),
  });
  if (!response.ok) throw new Error('Failed to create expense transaction');
  return response.json();
};

const updateExpenseTransaction = async ({ id, ...expenseTransactionData }: any): Promise<ExpenseTransaction> => {
  const response = await fetch(`/api/expense-transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(expenseTransactionData),
  });
  if (!response.ok) throw new Error('Failed to update expense transaction');
  return response.json();
}

const deleteExpenseTransaction = async (id: string): Promise<void> => {
  const response = await fetch(`/api/expense-transactions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete transfer transaction')
  }
}

export const useExpenseTransactionsQuery = (
  skip?: number, 
  take?: number,
  search?: string,
  dateFilter?: string
) => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending,
    error,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.expenseTransactions, 
      { skip, take, search, dateFilter }
    ],
    queryFn: () => fetchExpenseTransactions(skip, take, search, dateFilter),
    staleTime: 5 * 60 * 1000,
  });

  const createExpenseTransactionMutation = useMutation({
    mutationFn: createExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    },
  });

  const updateExpenseTransactionMutation = useMutation({
    mutationFn: updateExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    },
  });

  const deleteExpenseTransactionMutation = useMutation({
    mutationFn: deleteExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    }
  })

  return {
    expenseTransactions: data?.transactions || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createExpenseTransaction: createExpenseTransactionMutation.mutateAsync,
    updateExpenseTransaction: updateExpenseTransactionMutation.mutateAsync,
    deleteExpenseTransaction: deleteExpenseTransactionMutation.mutateAsync,
    isCreating: createExpenseTransactionMutation.isPending,
    isUpdating: updateExpenseTransactionMutation.isPending,
    isDeleting: deleteExpenseTransactionMutation.isPending,
  };
};

const fetchExpenseTransaction = async (id: string): Promise<ExpenseTransaction> => {
  const response = await fetch(`/api/expense-transactions/${id}`);
  if (!response.ok) throw new Error('Failed to fetch expense transaction');
  return response.json();
}

export const useExpenseTransactionQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.expenseTransaction(id),
    queryFn: () => fetchExpenseTransaction(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    expenseTransactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}