import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ExpenseType = {
  id: string;
  name: string;
  monthlyBudget?: string | null;
  subcategories?: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const QUERY_KEYS = {
  budgets: ['budgets'] as const,
  budget: (id: string) => ['budgets', id] as const,
}

const fetchBudgets = async (): Promise<ExpenseType[]> => {
  const response = await fetch('/api/expense-types');
  if (!response.ok) throw new Error('Failed to fetch budgets');
  return response.json();
}

const createBudget = async (budgetData: any): Promise<ExpenseType> => {
  const response = await fetch('/api/expense-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budgetData),
  });
  if (!response.ok) throw new Error('Failed to create budget');
  return response.json();
};

const updateBudget = async ({ id, ...budgetData }: any): Promise<ExpenseType> => {
  const response = await fetch(`/api/expense-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budgetData),
  });
  if (!response.ok) throw new Error('Failed to update budget');
  return response.json();
}

const deleteBudget = async (id: string): Promise<{ message: string; reassignedCount: number}> => {
  const response = await fetch(`/api/expense-types/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete expense type');
  }

  return response.json();
}

export const useExpenseTypesQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: budgets = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.budgets,
    queryFn: fetchBudgets,
    staleTime: 5 * 60 * 1000,
  });

  const createBudgetMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
    },
  });

  const updateBudgetsMutation = useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
    }
  })

  return {
    budgets,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createBudget: createBudgetMutation.mutateAsync,
    updateBudget: updateBudgetsMutation.mutateAsync,
    deleteBudget: deleteBudgetMutation.mutateAsync,
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetsMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending,
  };
};

const fetchBudget = async (id: string): Promise<ExpenseType> => {
  const response = await fetch(`/api/expense-types/${id}`);
  if (!response.ok) throw new Error('Failed to fetch budget');
  return response.json();
}

export const useExpenseTypeQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.budget(id),
    queryFn: () => fetchBudget(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    budgetData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}