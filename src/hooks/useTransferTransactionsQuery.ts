import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type TransferTransaction = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  transferTypeId: string;
  date: string;
  notes: string | null;
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
}

const QUERY_KEYS = {
  transfers: ['transfers'] as const,
  transfer: (id: string) => ['transfers', id] as const,
}

const fethTransfers = async (): Promise<TransferTransaction[]> => {
  const response = await fetch('/api/transfer-transactions');
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

const createTransfer = async (transferData: any): Promise<TransferTransaction> => {
  const response = await fetch('/api/transfer-transactions', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(transferData),
  });
  if (!response.ok) throw new Error('Failed to create transfer transaction');
  return response.json();
};

const updateTransfer = async ({ id, ...transferData }: any): Promise<TransferTransaction> => {
  const response = await fetch(`/api/transfer-transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(transferData),
  });
  if (!response.ok) throw new Error('Failed to update transfer');
  return response.json();
}

export const useTransfersQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: transfers = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.transfers,
    queryFn: fethTransfers,
    staleTime: 5 * 60 * 1000,
  });

  const createTransferMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: updateTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QUERY_KEYS.transfers });
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  });

  return {
    transfers,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createTransfer: createTransferMutation.mutateAsync,
    updateTransfer: updateTransferMutation.mutateAsync,
    isCreating: createTransferMutation.isPending,
    isUpdating: updateTransferMutation.isPending,
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
 