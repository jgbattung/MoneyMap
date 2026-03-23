import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDateForAPI } from "@/lib/utils";
import type { RecentTransaction } from "./useRecentTransactions";

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
  feeAmount: number | null;
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

const RECENT_TRANSACTIONS_KEY = ['recentTransactions'] as const;

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
    date: formValues.date ? formatDateForAPI(formValues.date as Date) : now,
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
    date: formValues.date ? formatDateForAPI(formValues.date as Date) : now,
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transfers });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<TransferTransactionsResponse>({
        queryKey: QUERY_KEYS.transfers,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      const optimisticTransaction = buildOptimisticTransfer(variables.payload, variables.meta);
      const optimisticRecent = buildOptimisticRecentTransfer(variables.payload, variables.meta);

      queryClient.setQueriesData<TransferTransactionsResponse>(
        {
          queryKey: QUERY_KEYS.transfers,
          predicate: (query) => {
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
      toast.error("Failed to create transfer transaction", {
        description: "The transaction could not be saved. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: updateTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });

  const deleteTransferMutation = useMutation({
    mutationFn: deleteTransfer,
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.transfers });
      await queryClient.cancelQueries({ queryKey: RECENT_TRANSACTIONS_KEY });

      const previousTransactions = queryClient.getQueriesData<TransferTransactionsResponse>({
        queryKey: QUERY_KEYS.transfers,
      });
      const previousRecent = queryClient.getQueryData<RecentTransaction[]>(RECENT_TRANSACTIONS_KEY);

      queryClient.setQueriesData<TransferTransactionsResponse>(
        { queryKey: QUERY_KEYS.transfers },
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
      toast.error("Failed to delete transfer transaction", {
        description: "The transaction could not be deleted. Please try again.",
        duration: 6000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: RECENT_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
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

export const useTransferQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.transfer(id),
    queryFn: () => fetchTransfer(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    transactionData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}
