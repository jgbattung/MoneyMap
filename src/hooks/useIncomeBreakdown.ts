import { useQuery } from '@tanstack/react-query';

export interface IncomeBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface IncomeBreakdownData {
  month: number;
  year: number;
  totalEarned: number;
  data: IncomeBreakdownItem[];
  earliestMonth: number | null;
  earliestYear: number | null;
}

interface UseIncomeBreakdownReturn {
  breakdown: IncomeBreakdownData | null;
  isLoading: boolean;
  error: string | null;
}

export const useIncomeBreakdown = (month: number, year: number): UseIncomeBreakdownReturn => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['incomeBreakdown', month, year],
    queryFn: async () => {
      const response = await fetch(`/api/reports/income-breakdown?month=${month}&year=${year}`);

      if (!response.ok) {
        throw new Error('Failed to fetch income breakdown');
      }

      const data = await response.json();
      return data as IncomeBreakdownData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: month > 0 && year > 0,
  });

  return {
    breakdown: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};