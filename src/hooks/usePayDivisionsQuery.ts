import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateAfterTransactionWrite } from "./transactionInvalidations";
import type { CreatePayDivisionInput, RecordTransferInput } from "@/lib/validations/pay-division";

type NamedRef = { id: string; name: string };

export type PayDivisionItem = {
  id: string;
  divisionId: string;
  kind: 'TRANSFER' | 'EARMARK';
  label: string;
  detail: string | null;
  amount: string;
  sortOrder: number;
  parentItemId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  transferTypeId: string | null;
  transferTransactionId: string | null;
  completedAt: string | null;
  fromAccount: NamedRef | null;
  toAccount: NamedRef | null;
  // TransferTransaction.amount is a Float, so it arrives as a number.
  transferTransaction: { id: string; amount: number; date: string } | null;
};

export type PayDivision = {
  id: string;
  planId: string | null;
  planName: string;
  savePercent: string;
  payAmount: string;
  saveAmount: string;
  spendAmount: string;
  payDate: string;
  incomeTransactionId: string | null;
  createdAt: string;
  items: PayDivisionItem[];
};

const QUERY_KEYS = {
  payDivisions: ['payDivisions'] as const,
};

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    return new Error(data.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

const fetchPayDivisions = async (): Promise<PayDivision[]> => {
  const response = await fetch('/api/pay-divisions');
  if (!response.ok) throw new Error('Failed to fetch pay divisions');
  return response.json();
};

const createDivision = async (input: CreatePayDivisionInput): Promise<{ id: string }> => {
  const response = await fetch('/api/pay-divisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response, 'Failed to start checklist');
  return response.json();
};

const deleteDivision = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`/api/pay-divisions/${id}`, { method: 'DELETE' });
  if (!response.ok) throw await readError(response, 'Failed to delete checklist');
  return response.json();
};

type ToggleEarmarkVariables = { divisionId: string; itemId: string; done: boolean };

const toggleEarmark = async ({ divisionId, itemId, done }: ToggleEarmarkVariables) => {
  const response = await fetch(`/api/pay-divisions/${divisionId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
  if (!response.ok) throw await readError(response, 'Failed to update row');
  return response.json();
};

type RecordTransferVariables = RecordTransferInput & { divisionId: string; itemId: string };

const recordTransfer = async ({ divisionId, itemId, amount, date }: RecordTransferVariables) => {
  const response = await fetch(`/api/pay-divisions/${divisionId}/items/${itemId}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, date }),
  });
  if (!response.ok) throw await readError(response, 'Failed to record transfer');
  return response.json();
};

type UndoTransferVariables = { itemId: string; transferTransactionId: string };

// Untick reuses the existing transfer delete route; the checklist FK is SET NULL.
const undoTransfer = async ({ transferTransactionId }: UndoTransferVariables) => {
  const response = await fetch(`/api/transfer-transactions/${transferTransactionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw await readError(response, 'Failed to undo transfer');
  return response.json();
};

export const usePayDivisionsQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: payDivisions = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.payDivisions,
    queryFn: fetchPayDivisions,
    staleTime: 60 * 1000,
  });

  const invalidateDivisions = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payDivisions });
  };

  const invalidateAfterMoneyMoved = () => {
    invalidateAfterTransactionWrite(queryClient, QUERY_KEYS.payDivisions, [
      ['transfers'],
      ['expenseTransactions'],
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createDivision,
    onSuccess: invalidateDivisions,
    onError: (error) => {
      toast.error("Failed to start checklist", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDivision,
    onSuccess: invalidateDivisions,
    onError: () => {
      toast.error("Failed to delete checklist", {
        description: "The checklist could not be deleted. Please try again.",
        duration: 6000,
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleEarmark,
    onSettled: invalidateDivisions,
    onError: () => {
      toast.error("Failed to update row", {
        description: "The row could not be updated. Please try again.",
        duration: 6000,
      });
    },
  });

  const recordMutation = useMutation({
    mutationFn: recordTransfer,
    onSettled: invalidateAfterMoneyMoved,
    onError: (error) => {
      toast.error("Failed to record transfer", {
        description: error instanceof Error ? error.message : "The transfer could not be saved. Please try again.",
        duration: 6000,
      });
    },
  });

  const undoMutation = useMutation({
    mutationFn: undoTransfer,
    onSettled: invalidateAfterMoneyMoved,
    onError: () => {
      toast.error("Failed to undo transfer", {
        description: "The transfer could not be deleted. Please try again.",
        duration: 6000,
      });
    },
  });

  // Rows show a pending state until the server answers (no optimistic balance patching).
  const pendingItemIds = new Set<string>();
  if (toggleMutation.isPending && toggleMutation.variables) pendingItemIds.add(toggleMutation.variables.itemId);
  if (recordMutation.isPending && recordMutation.variables) pendingItemIds.add(recordMutation.variables.itemId);
  if (undoMutation.isPending && undoMutation.variables) pendingItemIds.add(undoMutation.variables.itemId);

  return {
    payDivisions,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createDivision: createMutation.mutateAsync,
    deleteDivision: deleteMutation.mutateAsync,
    toggleEarmark: toggleMutation.mutateAsync,
    recordTransfer: recordMutation.mutateAsync,
    undoTransfer: undoMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    pendingItemIds,
  };
};
