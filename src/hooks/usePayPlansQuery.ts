import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayPlanLine } from "@/lib/pay-division";
import type { PayPlanInput } from "@/lib/validations/pay-division";

type NamedRef = { id: string; name: string };

export type PayPlan = {
  id: string;
  name: string;
  savePercent: string;
  sourceAccountId: string | null;
  saveAccountId: string | null;
  spendAccountId: string | null;
  transferTypeId: string | null;
  lines: PayPlanLine[];
  sourceAccount: NamedRef | null;
  saveAccount: NamedRef | null;
  spendAccount: NamedRef | null;
  transferType: NamedRef | null;
  createdAt: string;
  updatedAt: string;
};

const QUERY_KEYS = {
  payPlans: ['payPlans'] as const,
};

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    return new Error(data.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

const fetchPayPlans = async (): Promise<PayPlan[]> => {
  const response = await fetch('/api/pay-plans');
  if (!response.ok) throw new Error('Failed to fetch pay plans');
  return response.json();
};

const createPayPlan = async (plan: PayPlanInput): Promise<PayPlan> => {
  const response = await fetch('/api/pay-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!response.ok) throw await readError(response, 'Failed to create pay plan');
  return response.json();
};

const updatePayPlan = async ({ id, ...plan }: PayPlanInput & { id: string }): Promise<PayPlan> => {
  const response = await fetch(`/api/pay-plans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!response.ok) throw await readError(response, 'Failed to update pay plan');
  return response.json();
};

const deletePayPlan = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`/api/pay-plans/${id}`, { method: 'DELETE' });
  if (!response.ok) throw await readError(response, 'Failed to delete pay plan');
  return response.json();
};

export const usePayPlansQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: payPlans = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.payPlans,
    queryFn: fetchPayPlans,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payPlans });
  };

  const createMutation = useMutation({ mutationFn: createPayPlan, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updatePayPlan, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deletePayPlan, onSuccess: invalidate });

  return {
    payPlans,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createPayPlan: createMutation.mutateAsync,
    updatePayPlan: updateMutation.mutateAsync,
    deletePayPlan: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
