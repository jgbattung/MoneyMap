import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS, type RecentTransaction } from "./useRecentTransactions";
import { invalidateAfterTransactionWrite } from "./transactionInvalidations";
import {
  applyAccountDelta,
  applyBudgetSpentDelta,
  restoreBalanceCaches,
  snapshotBalanceCaches,
} from "./optimisticBalances";

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

const isListQuery = (query: { queryKey: readonly unknown[] }) =>
  typeof query.queryKey[1] === 'object' && query.queryKey[1] !== null;

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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
        queryKey: QUERY_KEYS.expenseTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticExpense(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentExpense(variables.payload, variables.meta);

      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.expenseTransactions,
          predicate: (query) => {
            if (!isListQuery(query)) return false;
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

      // Optimistic balance / net-worth / budget deltas (expense = -amount).
      const previousBalances = snapshotBalanceCaches(queryClient);
      const amount = parseFloat(variables.payload.amount as string);
      const accountId = variables.payload.accountId as string;
      const expenseTypeId = variables.payload.expenseTypeId as string;

      if (!Number.isNaN(amount)) {
        if (variables.payload.isInstallment) {
          // Mirrors api/expense-transactions/route.ts:315-368 — only the first
          // monthly payment hits the balance, and only when startDate <= today.
          const installmentDuration = variables.payload.installmentDuration as number | undefined;
          const installmentStartDate = variables.payload.installmentStartDate as string | undefined;
          if (installmentDuration && installmentStartDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(installmentStartDate);
            startDate.setHours(0, 0, 0, 0);
            if (startDate <= today) {
              const monthlyAmount = amount / installmentDuration;
              applyAccountDelta(queryClient, accountId, -monthlyAmount);
              applyBudgetSpentDelta(queryClient, expenseTypeId, monthlyAmount, installmentStartDate);
            }
          }
        } else {
          const txDate = (variables.payload.date as string) || new Date().toISOString();
          applyAccountDelta(queryClient, accountId, -amount);
          applyBudgetSpentDelta(queryClient, expenseTypeId, amount, txDate);
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
      toast.error("Failed to create expense transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSuccess: (serverTransaction: ExpenseTransaction) => {
      // Give the optimistic row its real server id. We merge the id onto the
      // existing optimistic row instead of replacing it wholesale, because the
      // POST response is a bare create() result without the account/expenseType
      // relations the table renders. onSettled refetches the fully-shaped row shortly after.
      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        { queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery },
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
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.expenseTransactions);
    },
  });

  const updateExpenseTransactionMutation = useMutation({
    mutationFn: updateExpenseTransaction,
    onMutate: async (variables) => {
      const { id, ...changes } = variables;

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery });

      const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
        queryKey: QUERY_KEYS.expenseTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousBalances = snapshotBalanceCaches(queryClient);

      // The OLD row comes from the cached list data; if it is not cached
      // anywhere (e.g. deep-linked edit), balance/budget optimism is skipped
      // entirely and only the row patch applies — the refetch reconciles.
      const oldRow = previousTransactions
        .flatMap(([, data]) => data?.transactions ?? [])
        .find((t) => t.id === id);

      // Patch the edited row in all list caches (merge the changed scalar
      // fields; relation display objects reconcile via the refetch).
      const scalarChanges: Record<string, unknown> = { ...changes };
      delete scalarChanges.tagIds;
      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        { queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery },
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
        // Balance deltas mirror api/expense-transactions/[id]/route.ts:177-282.
        const oldAmount = oldRow.isInstallment && oldRow.monthlyAmount
          ? parseFloat(oldRow.monthlyAmount)
          : parseFloat(oldRow.amount);
        const newAccountId = (changes.accountId as string | undefined) ?? oldRow.accountId;
        const accountChanged = changes.accountId !== undefined && newAccountId !== oldRow.accountId;

        if (!Number.isNaN(oldAmount)) {
          if (changes.amount !== undefined) {
            const parsedAmount = parseFloat(changes.amount as string);
            const newAmount = changes.isInstallment && changes.installmentDuration
              ? parsedAmount / (changes.installmentDuration as number)
              : parsedAmount;
            if (!Number.isNaN(newAmount)) {
              if (accountChanged) {
                applyAccountDelta(queryClient, oldRow.accountId, oldAmount);
                applyAccountDelta(queryClient, newAccountId, -newAmount);
              } else {
                applyAccountDelta(queryClient, oldRow.accountId, -(newAmount - oldAmount));
              }
            }
          } else if (accountChanged) {
            applyAccountDelta(queryClient, oldRow.accountId, oldAmount);
            applyAccountDelta(queryClient, newAccountId, -oldAmount);
          }
        }

        // Budget bars: remove the old contribution, add the new one. Nets to
        // the amount difference when the category is unchanged, and moves the
        // spend between categories when it changed. Installment parents are
        // excluded (the month-scoped budget groupBy filters isInstallment).
        const newExpenseTypeId = (changes.expenseTypeId as string | undefined) ?? oldRow.expenseTypeId;
        const newDate = (changes.date as string | undefined) ?? oldRow.date;
        const newIsInstallment = (changes.isInstallment as boolean | undefined) ?? oldRow.isInstallment;

        if (!oldRow.isInstallment) {
          const oldBudgetAmount = parseFloat(oldRow.amount);
          if (!Number.isNaN(oldBudgetAmount)) {
            applyBudgetSpentDelta(queryClient, oldRow.expenseTypeId, -oldBudgetAmount, oldRow.date);
          }
        }
        if (!newIsInstallment) {
          const newBudgetAmount = changes.amount !== undefined
            ? parseFloat(changes.amount as string)
            : parseFloat(oldRow.amount);
          if (!Number.isNaN(newBudgetAmount)) {
            applyBudgetSpentDelta(queryClient, newExpenseTypeId, newBudgetAmount, newDate);
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
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.expenseTransactions);
    },
  });

  const deleteExpenseTransactionMutation = useMutation({
    mutationFn: deleteExpenseTransaction,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<ExpenseTransactionsResponse>({
        queryKey: QUERY_KEYS.expenseTransactions,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<ExpenseTransactionsResponse>(
        { queryKey: QUERY_KEYS.expenseTransactions, predicate: isListQuery },
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

      // Optimistic balance / net-worth / budget reversal (delete = +amount).
      // The old row comes from the pre-delete list snapshots; if it is not
      // cached anywhere, skip balance optimism — the refetch reconciles.
      // Installment parents are excluded (server rejects them on this route).
      const previousBalances = snapshotBalanceCaches(queryClient);
      const deletedRow = previousTransactions
        .flatMap(([, data]) => data?.transactions ?? [])
        .find((t) => t.id === deletedId);

      if (deletedRow && !deletedRow.isInstallment) {
        const amount = parseFloat(deletedRow.amount);
        if (!Number.isNaN(amount)) {
          applyAccountDelta(queryClient, deletedRow.accountId, amount);
          applyBudgetSpentDelta(queryClient, deletedRow.expenseTypeId, -amount, deletedRow.date);
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
      toast.error("Failed to delete expense transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.expenseTransactions);
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

export const useExpenseTransactionQuery = (id: string, options?: { enabled?: boolean }) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.expenseTransaction(id),
    queryFn: () => fetchExpenseTransaction(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });

  return {
    expenseTransactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}
