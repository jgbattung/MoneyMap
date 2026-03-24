import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS, type RecentTransaction } from "./useRecentTransactions";

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
  tags?: {
    id: string;
    name: string;
    color: string;
  }[];
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

type CreateIncomeVariables = {
  payload: Record<string, unknown>;
  meta: {
    accountName: string;
    incomeTypeName: string;
  };
};

const QUERY_KEYS = {
  incomeTransactions: ['incomeTransactions'] as const,
  incomeTransaction: (id: string) => ['incomeTransactions', id] as const,
}

const RECENT_TRANSACTIONS_KEY = RECENT_TRANSACTION_QUERY_KEYS.recentTransactions;

function buildOptimisticIncome(
  formValues: Record<string, unknown>,
  meta: { accountName: string; incomeTypeName: string }
): IncomeTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',
    accountId: formValues.accountId as string,
    incomeTypeId: formValues.incomeTypeId as string,
    name: formValues.name as string,
    amount: formValues.amount as string,
    date: (formValues.date as string) || now,
    description: (formValues.description as string) || null,
    createdAt: now,
    updatedAt: now,
    account: { id: formValues.accountId as string, name: meta.accountName },
    incomeType: { id: formValues.incomeTypeId as string, name: meta.incomeTypeName },
    tags: [],
  };
}

function buildOptimisticRecentIncome(
  formValues: Record<string, unknown>,
  meta: { accountName: string; incomeTypeName: string }
): RecentTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    type: 'INCOME',
    name: formValues.name as string,
    amount: parseFloat(formValues.amount as string),
    date: (formValues.date as string) || now,
    accountId: formValues.accountId as string,
    accountName: meta.accountName,
    categoryId: formValues.incomeTypeId as string,
    categoryName: meta.incomeTypeName,
  };
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

const createIncomeTransaction = async (incomeTransactionData: Record<string, unknown>): Promise<IncomeTransaction> => {
  const response = await fetch('/api/income-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(incomeTransactionData),
  });
  if (!response.ok) throw new Error('Failed to create income transaction');
  return response.json();
};

const updateIncomeTransaction = async ({ id, ...incomeTransactionData }: { id: string; [key: string]: unknown }): Promise<IncomeTransaction> => {
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
    isPlaceholderData,
    isFetching,
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.incomeTransactions,
      { skip, take, search, dateFilter, accountId }
    ],
    queryFn: () => fetchIncomeTransactions(skip, take, search, dateFilter, accountId),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const createIncomeTransactionMutation = useMutation({
    mutationFn: (variables: CreateIncomeVariables) => createIncomeTransaction(variables.payload),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<IncomeTransactionsResponse>({
        queryKey: QUERY_KEYS.incomeTransactions,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticIncome(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentIncome(variables.payload, variables.meta);

      queryClient.setQueriesData<IncomeTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.incomeTransactions,
          predicate: (query) => {
            const params = query.queryKey[1] as UseIncomeTransactionsOptions | undefined;
            if (!params) return true;
            const isFirstPage = !params.skip || params.skip === 0;
            const noSearch = !params.search;
            const dateOk = !params.dateFilter || params.dateFilter === 'view-all'
              || params.dateFilter === 'this-month' || params.dateFilter === 'this-year';
            return isFirstPage && noSearch && dateOk;
          },
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: [optimisticTransaction, ...old.transactions],
            total: old.total + 1,
          };
        }
      );

      queryClient.setQueryData<RecentTransaction[]>(
        RECENT_TRANSACTIONS_KEY,
        (old) => {
          if (!old) return [optimisticRecent];
          return [optimisticRecent, ...old].slice(0, 5);
        }
      );

      return { previousTransactions, previousRecent };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousRecent !== undefined) {
        queryClient.setQueryData(RECENT_TRANSACTIONS_KEY, context.previousRecent);
      }
      toast.error("Failed to create income transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
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
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['incomeBreakdown'] });
    },
  });

  const deleteIncomeTransactionMutation = useMutation({
    mutationFn: deleteIncomeTransaction,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<IncomeTransactionsResponse>({
        queryKey: QUERY_KEYS.incomeTransactions,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<IncomeTransactionsResponse>(
        { queryKey: QUERY_KEYS.incomeTransactions },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.filter(t => t.id !== deletedId),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      queryClient.setQueryData<RecentTransaction[]>(
        RECENT_TRANSACTIONS_KEY,
        (old) => {
          if (!old) return old;
          return old.filter(t => t.id !== deletedId);
        }
      );

      return { previousTransactions, previousRecent };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousRecent !== undefined) {
        queryClient.setQueryData(RECENT_TRANSACTIONS_KEY, context.previousRecent);
      }
      toast.error("Failed to delete income transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['incomeBreakdown'] });
    },
  });

  return {
    incomeTransactions: data?.transactions || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    isFetchingMore: isFetching && isPlaceholderData,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createIncomeTransaction: createIncomeTransactionMutation.mutate,
    createIncomeTransactionAsync: createIncomeTransactionMutation.mutateAsync,
    updateIncomeTransaction: updateIncomeTransactionMutation.mutateAsync,
    deleteIncomeTransaction: deleteIncomeTransactionMutation.mutate,
    deleteIncomeTransactionAsync: deleteIncomeTransactionMutation.mutateAsync,
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
