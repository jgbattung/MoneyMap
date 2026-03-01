import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

const QUERY_KEYS = {
  transfers: ['transfers'] as const,
  transfer: (id: string) => ['transfers', id] as const,
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
  if (!response.ok) throw new Error('Failed to update transfer');
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
  } = useQuery({
    queryKey: [
      ...QUERY_KEYS.transfers, 
      { skip, take, search, dateFilter, accountId }
    ],
    queryFn: () => fetchTransfers(skip, take, search, dateFilter, accountId),
    staleTime: 5 * 60 * 1000,
  });

  const createTransferMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: updateTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    }
  });

  const deleteTransferMutation = useMutation({
    mutationFn: deleteTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['annualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    },
  });

  return {
    transfers: data?.transactions || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createTransfer: createTransferMutation.mutateAsync,
    updateTransfer: updateTransferMutation.mutateAsync,
    deleteTransfer: deleteTransferMutation.mutateAsync,
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