import { useQuery } from '@tanstack/react-query';

export interface ExpenseBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface ExpenseBreakdownData {
  month: number;
  year: number;
  totalSpent: number;
  data: ExpenseBreakdownItem[];
  earliestMonth: number | null;
  earliestYear: number | null;
}

interface UseExpenseBreakdownReturn {
  breakdown: ExpenseBreakdownData | null;
  isLoading: boolean;
  error: string | null;
}

export const useExpenseBreakdown = (month: number, year: number): UseExpenseBreakdownReturn => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenseBreakdown', month, year],
    queryFn: async () => {
      const response = await fetch(`/api/reports/expense-breakdown?month=${month}&year=${year}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch expense breakdown');
      }
      
      const data = await response.json();
      return data as ExpenseBreakdownData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: month > 0 && year > 0, // Only run query if valid month/year
  });

  return {
    breakdown: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
};