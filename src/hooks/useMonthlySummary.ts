import { useQuery } from '@tanstack/react-query';

interface MonthData {
  income: number;
  expenses: number;
  savings: number;
}

interface MonthlySummaryData {
  currentMonth: MonthData;
  lastMonth: MonthData;
}

interface UseMonthlySummaryReturn {
  summary: MonthlySummaryData | null;
  isLoading: boolean;
  error: string | null;
}

export const useMonthlySummary = (): UseMonthlySummaryReturn => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlySummary'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/monthly-summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch monthly summary');
      }
      
      const data = await response.json();
      return data as MonthlySummaryData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    summary: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};