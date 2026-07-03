import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BudgetStatusItem } from "./useBudgetStatus";

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

const createBudget = async (budgetData: Record<string, unknown>): Promise<ExpenseType> => {
  const response = await fetch('/api/expense-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budgetData),
  });
  if (!response.ok) throw new Error('Failed to create budget');
  return response.json();
};

const updateBudget = async ({ id, ...budgetData }: { id: string; [key: string]: unknown }): Promise<ExpenseType> => {
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
    onMutate: async (budgetData) => {
      // Optimistically add the new budget to the budgets-page table so it
      // appears instantly instead of waiting for the refetch round-trip.
      await queryClient.cancelQueries({ queryKey: ['budgetStatus'] });
      const previous = queryClient.getQueriesData<BudgetStatusItem[]>({ queryKey: ['budgetStatus'] });

      const optimistic: BudgetStatusItem = {
        id: `optimistic-${crypto.randomUUID()}`,
        name: (budgetData.name as string) ?? '',
        monthlyBudget: budgetData.monthlyBudget ? parseFloat(budgetData.monthlyBudget as string) : null,
        spentAmount: 0,
        progressPercentage: 0,
        isOverBudget: false,
      };

      // Only the budgets-page cache (all=true); leave the dashboard's top-5 untouched.
      queryClient.setQueriesData<BudgetStatusItem[]>(
        {
          queryKey: ['budgetStatus'],
          predicate: (query) =>
            (query.queryKey[1] as { all?: boolean } | undefined)?.all === true,
        },
        (old) => (old ? [...old, optimistic] : old)
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
    },
  });

  const updateBudgetsMutation = useMutation({
    mutationFn: updateBudget,
    onMutate: async (variables) => {
      const { id, ...changes } = variables;

      // Optimistically patch the edited budget so the row updates instantly.
      // Unlike create/delete, an edited existing item may appear in BOTH the
      // dashboard top-5 and the all=true budgets-page caches — patch all.
      await queryClient.cancelQueries({ queryKey: ['budgetStatus'] });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.budgets });

      const previousBudgetStatus = queryClient.getQueriesData<BudgetStatusItem[]>({ queryKey: ['budgetStatus'] });
      const previousBudgets = queryClient.getQueryData<ExpenseType[]>(QUERY_KEYS.budgets);

      const hasName = changes.name !== undefined;
      const hasBudget = changes.monthlyBudget !== undefined;

      queryClient.setQueriesData<BudgetStatusItem[]>(
        { queryKey: ['budgetStatus'] },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((item) => {
            if (item.id !== id) return item;
            const monthlyBudget = hasBudget
              ? (changes.monthlyBudget ? parseFloat(changes.monthlyBudget as string) : null)
              : item.monthlyBudget;
            // Same math as the budget-status route, from the cached spentAmount.
            const progressPercentage = monthlyBudget && monthlyBudget > 0
              ? Math.round((item.spentAmount / monthlyBudget) * 100 * 100) / 100
              : 0;
            const isOverBudget = monthlyBudget ? item.spentAmount > monthlyBudget : false;
            return {
              ...item,
              ...(hasName && { name: changes.name as string }),
              monthlyBudget,
              progressPercentage,
              isOverBudget,
            };
          });
        }
      );

      queryClient.setQueryData<ExpenseType[]>(QUERY_KEYS.budgets, (old) => {
        if (!old) return old;
        return old.map((b) =>
          b.id === id
            ? {
                ...b,
                ...(hasName && { name: changes.name as string }),
                ...(hasBudget && { monthlyBudget: (changes.monthlyBudget as string | null) ?? null }),
              }
            : b
        );
      });

      return { previousBudgetStatus, previousBudgets };
    },
    onError: (_error, _variables, context) => {
      context?.previousBudgetStatus?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousBudgets !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.budgets, context.previousBudgets);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: deleteBudget,
    onMutate: async (deletedId: string) => {
      // Optimistically remove the budget from the budgets-page table.
      await queryClient.cancelQueries({ queryKey: ['budgetStatus'] });
      const previous = queryClient.getQueriesData<BudgetStatusItem[]>({ queryKey: ['budgetStatus'] });

      queryClient.setQueriesData<BudgetStatusItem[]>(
        {
          queryKey: ['budgetStatus'],
          predicate: (query) =>
            (query.queryKey[1] as { all?: boolean } | undefined)?.all === true,
        },
        (old) => (old ? old.filter((b) => b.id !== deletedId) : old)
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: ['expenseTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgetStatus'] });
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