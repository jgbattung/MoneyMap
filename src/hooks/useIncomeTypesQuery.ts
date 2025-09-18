import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type IncomeType = {
  id: string;
  name: string;
  monthlyTarget?: string | null;
  createdAt: string;
  updatedAt: string;
}

const QUERY_KEYS = {
  incomeTypes: ['incomeTypes'] as const,
  incomeType: (id: string) => ['incomeTypes', id] as const,
}

const fetchIncomeTypes = async (): Promise<IncomeType[]> => {
  const response = await fetch('/api/income-types');
  if (!response.ok) throw new Error('Failed to fetch income types');
  return response.json();
}

const createIncomeType = async (incomeTypeData: any): Promise<IncomeType> => {
  const response = await fetch('/api/income-types', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json' },
    body: JSON.stringify(incomeTypeData),
  });
  if (!response.ok) throw new Error('Failed to created income type');
  return response.json();
};

const updateIncomeType = async ({ id, ...incomeTypeData }: any): Promise<IncomeType> => {
  const response = await fetch(`/api/income-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incomeTypeData),
  });
  if (!response.ok) throw new Error('Failed to update income type');
  return response.json();
}

export const useIncomeTypesQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: incomeTypes = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.incomeTypes,
    queryFn: fetchIncomeTypes,
    staleTime: 5 * 60 * 1000,
  });

  const createIncomeTypeMutation = useMutation({
    mutationFn: createIncomeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTypes });
    },
  });

  const updateIncomeTypeMutation = useMutation({
    mutationFn: updateIncomeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomeTypes });
    },
  });

  return {
    incomeTypes,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createIncomeType: createIncomeTypeMutation.mutateAsync,
    updateIncomeType: updateIncomeTypeMutation.mutateAsync,
    isCreating: createIncomeTypeMutation.isPending,
    isUpdating: updateIncomeTypeMutation.isPending,
  };
};

const fetchIncomeType = async (id: string): Promise<IncomeType> => {
  const response = await fetch(`/api/income-types/${id}`);
  if (!response.ok) throw new Error('Failed to fetch income type');
  return response.json();
}

export const useIncomeTypeQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.incomeType(id),
    queryFn: () => fetchIncomeType(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    incomeTypeData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}