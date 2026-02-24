import { useQuery } from "@tanstack/react-query";

export interface AnnualSummaryMonth {
  month: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

export interface AnnualSummaryYear {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  months: AnnualSummaryMonth[];
}

interface AnnualSummaryResponse {
  years: AnnualSummaryYear[];
}

interface UseAnnualSummaryReturn {
  years: AnnualSummaryYear[];
  isLoading: boolean;
  error: string | null;
}

const QUERY_KEY = ["annualSummary"] as const;

export { QUERY_KEY as ANNUAL_SUMMARY_QUERY_KEY };

export const useAnnualSummary = (): UseAnnualSummaryReturn => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/reports/annual-summary");

      if (!response.ok) {
        throw new Error("Failed to fetch annual summary");
      }

      return response.json() as Promise<AnnualSummaryResponse>;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    years: data?.years ?? [],
    isLoading,
    error: error ? error.message : null,
  };
};