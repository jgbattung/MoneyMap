import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RECENT_TRANSACTION_QUERY_KEYS } from "./useRecentTransactions";

export type Installment = {
  id: string;
  userId: string;
  accountId: string;
  expenseTypeId: string;
  expenseSubcategoryId?: string | null;
  name: string;
  amount: string;
  date: string;
  isInstallment: boolean;
  installmentDuration?: number | null;
  remainingInstallments?: number | null;
  installmentStartDate?: string | null;
  monthlyAmount?: string | null;
  lastProcessedDate?: string | null;
  installmentStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
  };
  expenseType: {
    id: string;
    name: string;
  };
  expenseSubcategory?: {
    id: string;
    name: string;
  } | null;
};

const INSTALLMENTS_KEY = ['installments'] as const;

const INVALIDATION_KEYS: string[][] = [
  ['installments'],
  ['expenseTransactions'],
  [...RECENT_TRANSACTION_QUERY_KEYS.recentTransactions],
  ['accounts'],
  ['cards'],
  ['netWorth'],
  ['netWorthHistory'],
  ['monthlySummary'],
  ['budgetStatus'],
  ['annualSummary'],
  ['expenseBreakdown'],
];

const fetchInstallments = async (status: 'ACTIVE' | 'ALL'): Promise<Installment[]> => {
  const response = await fetch(`/api/installments?status=${status}`);
  if (!response.ok) throw new Error('Failed to fetch installments');
  const data = await response.json();
  return data.installments;
};

const fetchInstallment = async (id: string): Promise<Installment> => {
  const response = await fetch(`/api/installments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch installment');
  return response.json();
};

const patchInstallment = async (payload: { id: string; [k: string]: unknown }): Promise<Installment> => {
  const { id, ...body } = payload;
  const response = await fetch(`/api/installments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update installment');
  }
  return response.json();
};

const removeInstallment = async (id: string): Promise<void> => {
  const response = await fetch(`/api/installments/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete installment');
  }
};

export const useInstallmentsQuery = (options?: { status?: 'ACTIVE' | 'ALL' }) => {
  const status = options?.status ?? 'ACTIVE';
  const queryClient = useQueryClient();

  const { data: installments = [], isPending, error } = useQuery({
    queryKey: [...INSTALLMENTS_KEY, { status }],
    queryFn: () => fetchInstallments(status),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: patchInstallment,
    onSuccess: () => {
      INVALIDATION_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeInstallment,
    onError: (error: Error) => {
      toast.error("Failed to delete installment", {
        description: error.message,
        duration: 6000,
      });
    },
    onSettled: () => {
      INVALIDATION_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  return {
    installments,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    updateInstallment: updateMutation.mutateAsync,
    deleteInstallment: deleteMutation.mutate,
    deleteInstallmentAsync: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useInstallmentQuery = (id: string, opts?: { enabled?: boolean }) => {
  const { data, isPending, error } = useQuery({
    queryKey: [...INSTALLMENTS_KEY, id],
    queryFn: () => fetchInstallment(id),
    enabled: !!id && (opts?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });

  return {
    installmentData: data,
    isFetching: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
  };
};
