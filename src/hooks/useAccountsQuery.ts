import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Account = {
  id: string;
  name: string;
  accountType: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH" | "CRYPTO" | "RETIREMENT" | "REAL_ESTATE" | "OTHER";
  currentBalance: string;
  initialBalance: string;
  addToNetWorth: boolean;
};

const QUERY_KEYS = {
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
};

const fetchAccounts = async (): Promise<Account[]> => {
  const response = await fetch('/api/accounts');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
};

const fetchAccount = async (id: string): Promise<Account> => {
  const response = await fetch(`/api/accounts/${id}`);
  if (!response) throw new Error('Failed to fetch account');
  return response.json();
}

const createAccount = async (accountData: any): Promise<Account> => {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!response.ok) throw new Error('Failed to create account');
  return response.json();
};

const updateAccount = async ({ id, ...accountData }: any): Promise<Account> => {
  const response = await fetch(`/api/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!response.ok) throw new Error('Failed to update account');
  return response.json();
};

export const useAccountsQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: accounts = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for financial data
  });

  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    },
  });

  return {
    accounts,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createAccount: createAccountMutation.mutateAsync,
    updateAccount: updateAccountMutation.mutateAsync,
    isCreating: createAccountMutation.isPending,
    isUpdating: updateAccountMutation.isPending,
    createError: createAccountMutation.error instanceof Error ? createAccountMutation.error.message : null,
    updateError: updateAccountMutation.error instanceof Error ? updateAccountMutation.error.message : null,
  };
};

export const useAccountQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.account(id),
    queryFn: () => fetchAccount(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data,
    isFetching: isPending,
    error,
  };
}