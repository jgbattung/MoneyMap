import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS, type RecentTransaction } from "./useRecentTransactions";
import { invalidateAfterTransactionWrite } from "./transactionInvalidations";
import {
  applyAccountDelta,
  restoreBalanceCaches,
  snapshotBalanceCaches,
} from "./optimisticBalances";

export type TransferTransaction = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  transferTypeId: string;
  date: string;
  notes: string | null;
  // Prisma Decimal — string in server responses, number on optimistic rows.
  feeAmount: number | string | null;
  feeExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
  fromAccount: {
    id: string;
    name: string;
    currentBalance: number;
  };
  toAccount: {
    id: string;
    name: string;
    currentBalance: number;
  };
  transferType: {
    id: string;
    name: string;
  };
  feeExpense?: {
    id: string;
    name: string;
    amount: number;
    description: string | null;
  } | null;
  tags?: {
    id: string;
    name: string;
    color: string;
  }[];
}

type TransferTransactionsResponse = {
  transactions: TransferTransaction[];
  total: number;
  hasMore: boolean;
}

interface UseTransfersOptions {
  skip?: number;
  take?: number;
  search?: string;
  dateFilter?: string;
  accountId?: string;
}

type CreateTransferVariables = {
  payload: Record<string, unknown>;
  meta: {
    fromAccountName: string;
    toAccountName: string;
    transferTypeName: string;
  };
};

const QUERY_KEYS = {
  transfers: ['transfers'] as const,
  transfer: (id: string) => ['transfers', id] as const,
}

const isListQuery = (query: { queryKey: readonly unknown[] }) =>
  typeof query.queryKey[1] === 'object' && query.queryKey[1] !== null;

const RECENT_TRANSACTIONS_KEY = RECENT_TRANSACTION_QUERY_KEYS.recentTransactions;

function buildOptimisticTransfer(
  formValues: Record<string, unknown>,
  meta: { fromAccountName: string; toAccountName: string; transferTypeName: string }
): TransferTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    userId: '',
    name: formValues.name as string,
    amount: parseFloat(formValues.amount as string),
    fromAccountId: formValues.fromAccountId as string,
    toAccountId: formValues.toAccountId as string,
    transferTypeId: formValues.transferTypeId as string,
    date: (formValues.date as string) || now,
    notes: (formValues.notes as string) || null,
    feeAmount: formValues.feeAmount ? parseFloat(formValues.feeAmount as string) : null,
    feeExpenseId: null,
    createdAt: now,
    updatedAt: now,
    fromAccount: { id: formValues.fromAccountId as string, name: meta.fromAccountName, currentBalance: 0 },
    toAccount: { id: formValues.toAccountId as string, name: meta.toAccountName, currentBalance: 0 },
    transferType: { id: formValues.transferTypeId as string, name: meta.transferTypeName },
    feeExpense: null,
    tags: [],
  };
}

function buildOptimisticRecentTransfer(
  formValues: Record<string, unknown>,
  meta: { fromAccountName: string; toAccountName: string; transferTypeName: string }
): RecentTransaction {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    type: 'TRANSFER',
    name: formValues.name as string,
    amount: parseFloat(formValues.amount as string),
    date: (formValues.date as string) || now,
    accountId: formValues.fromAccountId as string,
    accountName: meta.fromAccountName,
    categoryId: formValues.transferTypeId as string,
    categoryName: meta.transferTypeName,
    toAccountId: formValues.toAccountId as string,
    toAccountName: meta.toAccountName,
  };
}

const fetchTransfers = async (
  skip?: number,
  take?: number,
  search?: string,
  dateFilter?: string,
  accountId?: string
): Promise<TransferTransactionsResponse> => {
  const params = new URLSearchParams();
  if (skip !== undefined) params.append('skip', skip.toString());
  if (take !== undefined) params.append('take', take.toString());
  if (search) params.append('search', search);
  if (dateFilter && dateFilter !== 'view-all') params.append('dateFilter', dateFilter);
  if (accountId) params.append('accountId', accountId);

  const url = `/api/transfer-transactions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

const createTransfer = async (transferData: Record<string, unknown>): Promise<TransferTransaction> => {
  const response = await fetch('/api/transfer-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(transferData),
  });
  if (!response.ok) throw new Error('Failed to create transfer transaction');
  return response.json();
};

const updateTransfer = async ({ id, ...transferData }: { id: string; [key: string]: unknown }): Promise<TransferTransaction> => {
  const response = await fetch(`/api/transfer-transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(transferData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details ? JSON.stringify(errorData.details) : errorData.error || 'Failed to update transfer');
  }
  return response.json();
}

const deleteTransfer = async (id: string): Promise<void> => {
  const response = await fetch(`/api/transfer-transactions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete transfer transaction');
  }
};

export const useTransfersQuery = (options: UseTransfersOptions = {}) => {
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
      ...QUERY_KEYS.transfers,
      { skip, take, search, dateFilter, accountId }
    ],
    queryFn: () => fetchTransfers(skip, take, search, dateFilter, accountId),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const createTransferMutation = useMutation({
    mutationFn: (variables: CreateTransferVariables) => createTransfer(variables.payload),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transfers, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<TransferTransactionsResponse>({
        queryKey: QUERY_KEYS.transfers,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticTransfer(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentTransfer(variables.payload, variables.meta);

      queryClient.setQueriesData<TransferTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.transfers,
          predicate: (query) => {
            if (!isListQuery(query)) return false;
            const params = query.queryKey[1] as UseTransfersOptions | undefined;
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

      // Optimistic balance / net-worth deltas (transfer = -amount on from,
      // +amount on to, -fee on from). A transfer between two addToNetWorth
      // accounts nets to zero on currentNetWorth via the per-account deltas.
      const previousBalances = snapshotBalanceCaches(queryClient);
      const amount = parseFloat(variables.payload.amount as string);
      const fromAccountId = variables.payload.fromAccountId as string;
      const toAccountId = variables.payload.toAccountId as string;
      const feeAmount = variables.payload.feeAmount
        ? parseFloat(variables.payload.feeAmount as string)
        : 0;

      if (!Number.isNaN(amount)) {
        applyAccountDelta(queryClient, fromAccountId, -amount);
        applyAccountDelta(queryClient, toAccountId, amount);
      }
      if (!Number.isNaN(feeAmount) && feeAmount > 0) {
        applyAccountDelta(queryClient, fromAccountId, -feeAmount);
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
      toast.error("Failed to create transfer transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSuccess: (serverTransaction: TransferTransaction) => {
      // Give the optimistic row its real server id. We merge the id onto the
      // existing optimistic row instead of replacing it wholesale, because the
      // POST response is a bare create() result without the account relations
      // the table renders. onSettled refetches the fully-shaped row shortly after.
      queryClient.setQueriesData<TransferTransactionsResponse>(
        { queryKey: QUERY_KEYS.transfers, predicate: isListQuery },
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
      // expenseTransactions is an extra eager key because transfers can create fee expenses
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.transfers, [['expenseTransactions']]);
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: updateTransfer,
    onMutate: async (variables) => {
      const { id, ...changes } = variables;

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transfers, predicate: isListQuery });

      const previousTransactions = queryClient.getQueriesData<TransferTransactionsResponse>({
        queryKey: QUERY_KEYS.transfers,
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
      // fields, normalizing amounts to the cache's number format).
      const scalarChanges: Record<string, unknown> = { ...changes };
      delete scalarChanges.tagIds;
      if (scalarChanges.amount !== undefined) {
        scalarChanges.amount = parseFloat(String(scalarChanges.amount));
      }
      if (scalarChanges.feeAmount !== undefined) {
        const parsedFee = scalarChanges.feeAmount ? parseFloat(String(scalarChanges.feeAmount)) : 0;
        scalarChanges.feeAmount = parsedFee > 0 ? parsedFee : null;
      }
      queryClient.setQueriesData<TransferTransactionsResponse>(
        { queryKey: QUERY_KEYS.transfers, predicate: isListQuery },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.map((t) =>
              t.id === id ? { ...t, ...scalarChanges } : t
            ),
          };
        }
      );

      if (oldRow) {
        // Balance deltas mirror api/transfer-transactions/[id]/route.ts:
        // reverse the OLD from/to/fee deltas and apply the NEW ones.
        const oldAmount = oldRow.amount;
        const newAmount = changes.amount !== undefined
          ? parseFloat(String(changes.amount))
          : oldAmount;
        const effectiveFromId = (changes.fromAccountId as string | undefined) ?? oldRow.fromAccountId;
        const effectiveToId = (changes.toAccountId as string | undefined) ?? oldRow.toAccountId;
        const accountsChanged =
          effectiveFromId !== oldRow.fromAccountId || effectiveToId !== oldRow.toAccountId;

        if (!Number.isNaN(newAmount)) {
          if (accountsChanged) {
            applyAccountDelta(queryClient, oldRow.fromAccountId, oldAmount);
            applyAccountDelta(queryClient, oldRow.toAccountId, -oldAmount);
            applyAccountDelta(queryClient, effectiveFromId, -newAmount);
            applyAccountDelta(queryClient, effectiveToId, newAmount);
          } else {
            const amountDifference = newAmount - oldAmount;
            applyAccountDelta(queryClient, effectiveFromId, -amountDifference);
            applyAccountDelta(queryClient, effectiveToId, amountDifference);
          }
        }

        // Fee deltas only when the request carries feeAmount (server gates
        // all fee balance ops on feeAmount !== undefined).
        if (changes.feeAmount !== undefined) {
          // feeAmount is a Prisma Decimal — a string in server rows.
          const oldFee = oldRow.feeAmount != null ? parseFloat(String(oldRow.feeAmount)) : null;
          const parsedFee = changes.feeAmount ? parseFloat(String(changes.feeAmount)) : 0;
          const newFee = parsedFee > 0 ? parsedFee : null;

          if (oldFee === null && newFee !== null) {
            applyAccountDelta(queryClient, effectiveFromId, -newFee);
          } else if (oldFee !== null && newFee === null) {
            applyAccountDelta(queryClient, oldRow.fromAccountId, oldFee);
          } else if (oldFee !== null && newFee !== null && oldRow.feeExpenseId) {
            if (oldRow.fromAccountId !== effectiveFromId) {
              applyAccountDelta(queryClient, oldRow.fromAccountId, oldFee);
              applyAccountDelta(queryClient, effectiveFromId, -newFee);
            } else {
              applyAccountDelta(queryClient, effectiveFromId, -(newFee - oldFee));
            }
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
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.transfers, [['expenseTransactions']]);
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: deleteTransfer,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transfers, predicate: isListQuery });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<TransferTransactionsResponse>({
        queryKey: QUERY_KEYS.transfers,
        predicate: isListQuery,
      }).filter(([, data]) => data !== undefined);
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<TransferTransactionsResponse>(
        { queryKey: QUERY_KEYS.transfers, predicate: isListQuery },
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

      // Optimistic balance / net-worth reversal (exact reverse of create:
      // +amount on from, -amount on to, +fee on from). The old row comes
      // from the pre-delete list snapshots; not cached → skip.
      const previousBalances = snapshotBalanceCaches(queryClient);
      const deletedRow = previousTransactions
        .flatMap(([, data]) => data?.transactions ?? [])
        .find((t) => t.id === deletedId);

      if (deletedRow && !Number.isNaN(deletedRow.amount)) {
        applyAccountDelta(queryClient, deletedRow.fromAccountId, deletedRow.amount);
        applyAccountDelta(queryClient, deletedRow.toAccountId, -deletedRow.amount);
        // feeAmount is a Prisma Decimal — a string in server rows.
        const deletedFee = deletedRow.feeAmount ? parseFloat(String(deletedRow.feeAmount)) : 0;
        if (!Number.isNaN(deletedFee) && deletedFee > 0 && deletedRow.feeExpenseId) {
          applyAccountDelta(queryClient, deletedRow.fromAccountId, deletedFee);
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
      toast.error("Failed to delete transfer transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.transfers, [['expenseTransactions']]);
    },
  });

  return {
    transfers: data?.transactions || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    isFetchingMore: isFetching && isPlaceholderData,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createTransfer: createTransferMutation.mutate,
    createTransferAsync: createTransferMutation.mutateAsync,
    updateTransfer: updateTransferMutation.mutateAsync,
    deleteTransfer: deleteTransferMutation.mutate,
    deleteTransferAsync: deleteTransferMutation.mutateAsync,
    isCreating: createTransferMutation.isPending,
    isUpdating: updateTransferMutation.isPending,
    isDeleting: deleteTransferMutation.isPending,
  };
}

const fetchTransfer = async (id: string): Promise<TransferTransaction> => {
  const response = await fetch(`/api/transfer-transactions/${id}`);
  if (!response.ok) throw new Error('Faile to fetch transfer');
  return response.json();
}

export const useTransferQuery = (id: string, options?: { enabled?: boolean }) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.transfer(id),
    queryFn: () => fetchTransfer(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });

  return {
    transactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}
