import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS, type RecentTransaction } from "./useRecentTransactions";

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
  tags?: {
    id: string;
    name: string;
    color: string;
  }[];
}

type ExpenseTransactionsResponse = {
  transactions: ExpenseTransaction[];
  total: number;
  hasMore: boolean;
}

interface UseExpenseTransactionsOptions {
  skip?: number;
  take?: number;
  search?: string;
  dateFilter?: string;
  accountId?: string;
}

type CreateExpenseVariables = {
  payload: Record<string, unknown>;
  meta: {
    accountName: string;
    expenseTypeName: string;
    subcategoryName?: string;
  };
};

const QUERY_KEYS = {
  expenseTransactions: ['expenseTransactions'] as const,
  expenseTransaction: (id: string) => ['expenseTransactions', id] as const,
}

const RECENT_TRANSACTIONS_KEY = RECENT_TRANSACTION_QUERY_KEYS.recentTransactions;

function buildOptimisticExpense(
  formValues: Record<string, unknown>,
  meta: { accountName: string; expenseTypeName: string; subcategoryName?: string }
): ExpenseTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',
    accountId: formValues.accountId as string,
    expenseTypeId: formValues.expenseTypeId as string,
    expenseSubcategoryId: (formValues.expenseSubcategoryId === 'none' ? null : formValues.expenseSubcategoryId) as string | null,
    name: formValues.name as string,
    amount: formValues.amount as string,
    date: (formValues.date as string) || now,
    description: (formValues.description as string) || null,
    isInstallment: formValues.isInstallment as boolean,
    installmentDuration: (formValues.installmentDuration as number) || null,
    remainingInstallments: (formValues.installmentDuration as number) || null,
    installmentStartDate: (formValues.installmentStartDate as string) || null,
    monthlyAmount: null,
    createdAt: now,
    updatedAt: now,
    account: { id: formValues.accountId as string, name: meta.accountName },
    expenseType: { id: formValues.expenseTypeId as string, name: meta.expenseTypeName },
    expenseSubcategory: meta.subcategoryName
      ? { id: (formValues.expenseSubcategoryId as string), name: meta.subcategoryName }
      : null,
    tags: [],
  };
}

function buildOptimisticRecentExpense(
  formValues: Record<string, unknown>,
  meta: { accountName: string; expenseTypeName: string; subcategoryName?: string }
): RecentTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    type: 'EXPENSE',
    name: formValues.name as string,
    amount: parseFloat(formValues.amount as string),
    date: (formValues.date as string) || now,
    accountId: formValues.accountId as string,
    accountName: meta.accountName,
    categoryId: formValues.expenseTypeId as string,
    categoryName: meta.expenseTypeName,
  };
}

const fetchExpenseTransactions = async (
  skip?: number,
  take?: number,
  search?: string,
  dateFilter?: string,
  accountId?: string
): Promise<ExpenseTransactionsResponse> => {
  const params = new URLSearchParams();
  if (skip !== undefined) params.append('skip', skip.toString());
  if (take !== undefined) params.append('take', take.toString());
  if (search) params.append('search', search);
  if (dateFilter && dateFilter !== 'view-all') params.append('dateFilter', dateFilter);
  if (accountId) params.append('accountId', accountId);

  const url = `/api/expense-transactions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch expense transactions');
  return response.json();
}

const createExpenseTransaction = async (expenseTransactionData: Record<string, unknown>): Promise<ExpenseTransaction> => {
  const response = await fetch('/api/expense-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(expenseTransactionData),
  });
  if (!response.ok) throw new Error('Failed to create expense transaction');
  return response.json();
};

const updateExpenseTransaction = async ({ id, ...expenseTransactionData }: { id: string; [key: string]: unknown }): Promise<ExpenseTransaction> => {
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

export const useExpenseTransactionsQuery = (options: UseExpenseTransactionsOptions = {}) => {
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
      ...QUERY_KEYS.expenseTransactions,
      { skip, take, search, dateFilter, accountId }
    ],
    queryFn: () => fetchExpenseTransactions(skip, take, search, dateFilter, accountId),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const createExpenseTransactionMutation = useMutation({
    mutationFn: (variables: CreateExpenseVariables) => createExpenseTransaction(variables.payload),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
        queryKey: QUERY_KEYS.expenseTransactions,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticExpense(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentExpense(variables.payload, variables.meta);

      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.expenseTransactions,
          predicate: (query) => {
            const params = query.queryKey[1] as UseExpenseTransactionsOptions | undefined;
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
      toast.error("Failed to create expense transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseBreakdown'] });
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
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseBreakdown'] });
    },
  });

  const deleteExpenseTransactionMutation = useMutation({
    mutationFn: deleteExpenseTransaction,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
        queryKey: QUERY_KEYS.expenseTransactions,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        { queryKey: QUERY_KEYS.expenseTransactions },
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
      toast.error("Failed to delete expense transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenseTransactions });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseBreakdown'] });
    },
  });

  return {
    expenseTransactions: data?.transactions || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    isFetchingMore: isFetching && isPlaceholderData,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createExpenseTransaction: createExpenseTransactionMutation.mutate,
    createExpenseTransactionAsync: createExpenseTransactionMutation.mutateAsync,
    updateExpenseTransaction: updateExpenseTransactionMutation.mutateAsync,
    deleteExpenseTransaction: deleteExpenseTransactionMutation.mutate,
    deleteExpenseTransactionAsync: deleteExpenseTransactionMutation.mutateAsync,
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
