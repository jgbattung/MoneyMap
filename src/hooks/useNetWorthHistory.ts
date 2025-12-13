import { useQuery } from '@tanstack/react-query';

interface NetWorthHistoryData {
  month: string;
  netWorth: number;
}

interface UseNetWorthHistoryReturn {
  history: NetWorthHistoryData[];
  isLoading: boolean;
  error: string | null;
}

export const useNetWorthHistory = (): UseNetWorthHistoryReturn => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['netWorthHistory'],
    queryFn: async () => {
      const response = await fetch('/api/net-worth/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch net worth history');
      }
      
      const data = await response.json();
      return data.history as NetWorthHistoryData[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return {
    history: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
};