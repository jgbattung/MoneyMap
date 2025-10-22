import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ExpenseTransaction = {
  id: string;
  userId: string;
  accountId: string;
  expenseTypeId: string;
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
}

const QUERY_KEYS = {
  expenseTransactions: ['expenseTransactions'] as const,
  expenseTransaction: (id: string) => ['expenseTransactions', id] as const,
}

const fetchExpenseTransactions = async (): Promise<ExpenseTransaction[]> => {
  const response = await fetch('/api/expense-transactions');
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

export const useExpenseTransactionsQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: expenseTransactions = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.expenseTransactions,
    queryFn: fetchExpenseTransactions,
    staleTime: 5 * 60 * 1000,
  });

  const createExpenseTransactionMutation = useMutation({
    mutationFn: createExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  });

  const updateExpenseTransactionMutation = useMutation({
    mutationFn: updateExpenseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  });

  return {
    expenseTransactions,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createExpenseTransaction: createExpenseTransactionMutation.mutateAsync,
    updateExpenseTransaction: updateExpenseTransactionMutation.mutateAsync,
    isCreating: createExpenseTransactionMutation.isPending,
    isUpdating: updateExpenseTransactionMutation.isPending,
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