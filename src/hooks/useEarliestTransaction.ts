import { useQuery } from '@tanstack/react-query';

interface EarliestTransactionData {
  earliestMonth: number | null;
  earliestYear: number | null;
}

interface UseEarliestTransactionReturn {
  earliestMonth: number | null;
  earliestYear: number | null;
  isLoading: boolean;
}

export const useEarliestTransaction = (): UseEarliestTransactionReturn => {
  const { data, isLoading } = useQuery({
    queryKey: ['earliestTransaction'],
    queryFn: async () => {
      const response = await fetch('/api/reports/earliest-transaction');

      if (!response.ok) {
        throw new Error('Failed to fetch earliest transaction date');
      }

      return response.json() as Promise<EarliestTransactionData>;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — this rarely changes
    refetchOnWindowFocus: false,
  });

  return {
    earliestMonth: data?.earliestMonth ?? null,
    earliestYear: data?.earliestYear ?? null,
    isLoading,
  };
};