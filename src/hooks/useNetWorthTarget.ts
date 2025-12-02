import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface NetWorthTarget {
  target: number | null;
  targetDate: string | null;
};

interface UpdateTargetParams {
  target?: number | null;
  targetDate?: string | null;
};

const QUERY_KEYS = {
  netWorthTarget: ['netWorthTarget'] as const,
};

const fetchNetWorthTarget = async (): Promise<NetWorthTarget> => {
  const response = await fetch('/api/user/net-worth-target');
  if (!response.ok) throw new Error('Failed to fetch net worth target');
  return response.json();
};

const updateNetWorthTarget = async (data: UpdateTargetParams): Promise<NetWorthTarget> => {
  const response = await fetch('/api/user/net-worth-target', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update net worth target');
  return response.json();
};

export const useNetWorthTarget = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.netWorthTarget,
    queryFn: fetchNetWorthTarget,
    staleTime: 5 * 60 * 1000,
  });

  const updateTargetMutation = useMutation({
    mutationFn: updateNetWorthTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.netWorthTarget });
    },
  });

  return {
    target: data?.target ?? null,
    targetDate: data?.targetDate ?? null,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    updateTarget: updateTargetMutation.mutateAsync,
    isUpdating: updateTargetMutation.isPending,
  };
};