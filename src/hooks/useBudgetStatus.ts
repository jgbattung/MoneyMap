import { useQuery } from '@tanstack/react-query';

export interface BudgetStatusItem {
  id: string;
  name: string;
  monthlyBudget: number | null;
  spentAmount: number;
  progressPercentage: number;
  isOverBudget: boolean;
}

interface BudgetStatusResponse {
  budgets: BudgetStatusItem[];
}

const QUERY_KEYS = {
  budgetStatus: ['budgetStatus'] as const,
};

const fetchBudgetStatus = async (all: boolean): Promise<BudgetStatusItem[]> => {
  const response = await fetch(`/api/dashboard/budget-status${all ? '?all=true' : ''}`);

  if (!response.ok) {
    throw new Error('Failed to fetch budget status');
  }

  const data: BudgetStatusResponse = await response.json();
  return data.budgets;
};

export const useBudgetStatus = (options: { all?: boolean } = {}) => {
  const { all = false } = options;

  const {
    data: budgets = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.budgetStatus, { all }],
    queryFn: () => fetchBudgetStatus(all),
    staleTime: 5 * 60 * 1000,
  });

  return {
    budgets,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    refetch,
  };
};