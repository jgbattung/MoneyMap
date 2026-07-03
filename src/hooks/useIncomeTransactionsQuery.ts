import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS, type RecentTransaction } from "./useRecentTransactions";
import { invalidateAfterTransactionWrite } from "./transactionInvalidations";
import {
  applyAccountDelta,
  restoreBalanceCaches,
  snapshotBalanceCaches,
} from "./optimisticBalances";

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

const isListQuery = (query: { queryKey: readonly unknown[] }) =>
  typeof query.queryKey[1] === 'object' && query.queryKey[1] !== null;

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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<IncomeTransactionsResponse>({
        queryKey: QUERY_KEYS.incomeTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticIncome(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentIncome(variables.payload, variables.meta);

      queryClient.setQueriesData<IncomeTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.incomeTransactions,
          predicate: (query) => {
            if (!isListQuery(query)) return false;
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

      // Optimistic balance / net-worth delta (income = +amount; income does
      // not affect budget bars).
      const previousBalances = snapshotBalanceCaches(queryClient);
      const amount = parseFloat(variables.payload.amount as string);
      if (!Number.isNaN(amount)) {
        applyAccountDelta(queryClient, variables.payload.accountId as string, amount);
      }

      return { previousTransactions, previousRecent, previousBalances };
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
      restoreBalanceCaches(queryClient, context?.previousBalances);
      toast.error("Failed to create income transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSuccess: (serverTransaction: IncomeTransaction) => {
      // Give the optimistic row its real server id. We merge the id onto the
      // existing optimistic row instead of replacing it wholesale, because the
      // POST response is a bare create() result without the account relation
      // the table renders. onSettled refetches the fully-shaped row shortly after.
      queryClient.setQueriesData<IncomeTransactionsResponse>(
        { queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.map((t) =>
              t.id.startsWith('optimistic-') ? { ...t, id: serverTransaction.id } : t
            ),
          };
        }
      );
      queryClient.setQueryData<RecentTransaction[]>(
        RECENT_TRANSACTIONS_KEY,
        (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id.startsWith('optimistic-')
              ? { ...t, id: serverTransaction.id }
              : t
          );
        }
      );
    },
    onSettled: () => {
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.incomeTransactions);
    },
  });

  const updateIncomeTransactionMutation = useMutation({
    mutationFn: updateIncomeTransaction,
    onMutate: async (variables) => {
      const { id, ...changes } = variables;

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery });

      const previousTransactions = queryClient.getQueriesData<IncomeTransactionsResponse>({
        queryKey: QUERY_KEYS.incomeTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousBalances = snapshotBalanceCaches(queryClient);

      // The OLD row comes from the cached list data; if it is not cached
      // anywhere, balance optimism is skipped entirely and only the row
      // patch applies — the refetch reconciles.
      const oldRow = previousTransactions
        .flatMap(([, data]) => data?.transactions ?? [])
        .find((t) => t.id === id);

      // Patch the edited row in all list caches (merge the changed scalar
      // fields; relation display objects reconcile via the refetch).
      const scalarChanges: Record<string, unknown> = { ...changes };
      delete scalarChanges.tagIds;
      queryClient.setQueriesData<IncomeTransactionsResponse>(
        { queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.map((t) =>
              t.id === id
                ? {
                    ...t,
                    ...scalarChanges,
                    ...(scalarChanges.amount !== undefined && { amount: String(scalarChanges.amount) }),
                  }
                : t
            ),
          };
        }
      );

      if (oldRow) {
        // Balance deltas mirror api/income-transactions/[id]/route.ts (income
        // is the sign-inverse of expense).
        const oldAmount = parseFloat(oldRow.amount);
        const newAccountId = (changes.accountId as string | undefined) ?? oldRow.accountId;
        const accountChanged = changes.accountId !== undefined && newAccountId !== oldRow.accountId;

        if (!Number.isNaN(oldAmount)) {
          if (changes.amount !== undefined) {
            const newAmount = parseFloat(changes.amount as string);
            if (!Number.isNaN(newAmount)) {
              if (accountChanged) {
                applyAccountDelta(queryClient, oldRow.accountId, -oldAmount);
                applyAccountDelta(queryClient, newAccountId, newAmount);
              } else {
                applyAccountDelta(queryClient, oldRow.accountId, newAmount - oldAmount);
              }
            }
          } else if (accountChanged) {
            applyAccountDelta(queryClient, oldRow.accountId, -oldAmount);
            applyAccountDelta(queryClient, newAccountId, oldAmount);
          }
        }
      }

      return { previousTransactions, previousBalances };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      restoreBalanceCaches(queryClient, context?.previousBalances);
    },
    onSettled: () => {
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.incomeTransactions);
    },
  });

  const deleteIncomeTransactionMutation = useMutation({
    mutationFn: deleteIncomeTransaction,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<IncomeTransactionsResponse>({
        queryKey: QUERY_KEYS.incomeTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<IncomeTransactionsResponse>(
        { queryKey: QUERY_KEYS.incomeTransactions, predicate: isListQuery },
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

      // Optimistic balance / net-worth reversal (income delete = -amount).
      // The old row comes from the pre-delete list snapshots; if it is not
      // cached anywhere, skip balance optimism — the refetch reconciles.
      const previousBalances = snapshotBalanceCaches(queryClient);
      const deletedRow = previousTransactions
        .flatMap(([, data]) => data?.transactions ?? [])
        .find((t) => t.id === deletedId);

      if (deletedRow) {
        const amount = parseFloat(deletedRow.amount);
        if (!Number.isNaN(amount)) {
          applyAccountDelta(queryClient, deletedRow.accountId, -amount);
        }
      }

      return { previousTransactions, previousRecent, previousBalances };
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
      restoreBalanceCaches(queryClient, context?.previousBalances);
      toast.error("Failed to delete income transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.incomeTransactions);
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

export const useIncomeTransactionQuery = (id: string, options?: { enabled?: boolean }) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.incomeTransaction(id),
    queryFn: () => fetchIncomeTransaction(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });

  return {
    incomeTransactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}
