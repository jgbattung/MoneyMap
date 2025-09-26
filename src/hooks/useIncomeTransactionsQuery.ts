import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type IncomeTransaction = {
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
}

const QUERY_KEYS = {
  incomeTransactions: ['incomeTransactions'] as const,
  incomeTransaction: (id: string) => ['incomeTransactions', id] as const,
}

const fetchIncomeTransactions = async (): Promise<IncomeTransaction[]> => {
  const response = await fetch('/api/income-transactions');
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

export const useIncomeTransactionsQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: incomeTransactions = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.incomeTransactions,
    queryFn: fetchIncomeTransactions,
    staleTime: 5 * 60 * 1000,
  });

  const createIncomeTransactionMutation = useMutation({
    mutationFn: createIncomeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  });

  const updateIncomeTransactionMutation = useMutation({
    mutationFn: updateIncomeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  });

  return {
    incomeTransactions,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createIncomeTransaction: createIncomeTransactionMutation.mutateAsync,
    updateIncomeTransaction: updateIncomeTransactionMutation.mutateAsync,
    isCreating: createIncomeTransactionMutation.isPending,
    isUpdating: updateIncomeTransactionMutation.isPending,
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