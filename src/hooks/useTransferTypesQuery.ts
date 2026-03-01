import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type TransferType = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const QUERY_KEYS = {
  transferTypes: ['transferTypes'] as const,
  transferType: (id: string) => ['transferTypes', id] as const,
}

const fetchTransferTypes = async (): Promise<TransferType[]> => {
  const response = await fetch('/api/transfer-types');
  if (!response.ok) throw new Error('Failed to fetch transfer types');
  return response.json();
}

const createTransferType = async (transferTypeData: Record<string, unknown>): Promise<TransferType> => {
  const response = await fetch('/api/transfer-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferTypeData),
  });
  if (!response.ok) throw new Error('Failed to create transfer type');
  return response.json();
};

const updateTransferType = async ({ id, ...transferTypeData }: { id: string; [key: string]: unknown }): Promise<TransferType> => {
  const response = await fetch(`/api/transfer-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferTypeData),
  });
  if (!response.ok) throw new Error('Failed to update transfer type');
  return response.json();
}

const deleteTransferType = async (id: string): Promise<{ message: string; reassignedCount: number }> => {
  const response = await fetch(`/api/transfer-types/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete transfer type');
  }

  return response.json();
};

export const useTransferTypesQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: transferTypes = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.transferTypes,
    queryFn: fetchTransferTypes,
    staleTime: 5 * 60 * 1000,
  });

  const createTransferTypeMutation = useMutation({
    mutationFn: createTransferType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transferTypes });
    },
  });

  const updateTransferTypeMutation = useMutation({
    mutationFn: updateTransferType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transferTypes });
    },
  });

  const deleteTransferTypeMutation = useMutation({
    mutationFn: deleteTransferType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transferTypes });
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    },
  });

  return {
    transferTypes,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createTransferType: createTransferTypeMutation.mutateAsync,
    updateTransferType: updateTransferTypeMutation.mutateAsync,
    deleteTransferType: deleteTransferTypeMutation.mutateAsync,
    isCreating: createTransferTypeMutation.isPending,
    isUpdating: updateTransferTypeMutation.isPending,
    isDeleting: deleteTransferTypeMutation.isPending,
  };
};

const fetchTransferType = async (id: string): Promise<TransferType> => {
  const response = await fetch(`/api/transfer-types/${id}`);
  if (!response.ok) throw new Error('Failed to fetch transfer type');
  return response.json();
}

export const useTransferTypeQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.transferType(id),
    queryFn: () => fetchTransferType(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    transferTypeData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}

