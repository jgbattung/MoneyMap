import { useQuery } from "@tanstack/react-query";

interface NetWorthData {
  currentNetWorth: number;
  monthlyChange: {
    amount: number;
    percentage: number;
  };
};

const QUERY_KEYS = {
  netWorth: ['netWorth'] as const,
};

const fetchNetWorth = async (): Promise<NetWorthData> => {
  const response = await fetch('/api/net-worth');
  if (!response.ok) throw new Error('Failed to fetch net worth');
  return response.json();
};

export const useNetWorth = () => {
  const {
    data,
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.netWorth,
    queryFn: fetchNetWorth,
    staleTime: 2 * 60 * 1000,
  });

  return {
    netWorth: data?.currentNetWorth ?? 0,
    monthlyChange: data?.monthlyChange ?? { amount: 0, percentage: 0 },
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
  };
};