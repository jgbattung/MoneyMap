import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Card = {
  id: string;
  name: string;
  accountType: "CREDIT_CARD";
  currentBalance: string;
  initialBalance: string;
  addToNetWorth: boolean;
  statementDate?: number;
  dueDate?: number;
  cardGroup?: string | null;
  statementBalance?: string | null;
  lastStatementCalculationDate?: string | null;
};

const QUERY_KEYS = {
  cards: ['cards'] as const,
  card: (id: string) => ['cards', id] as const,
  cardGroup: (groupName: string) => ['cards', 'groups', groupName] as const,
}

const fetchCards = async (): Promise<Card[]> => {
  const response = await fetch('/api/cards');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
};

const createCard = async (cardData: Record<string, unknown>): Promise<Card> => {
  const transformedData = {
    ...cardData,
    initialBalance: cardData.initialBalance ? (-Math.abs(parseFloat(cardData.initialBalance))).toString() : '0'
  };

  const response = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformedData),
  });

  if (!response.ok) throw new Error ('Failed to create card');
  return response.json();
}

const updateCard = async ({ id, ...cardData }: { id: string; [key: string]: unknown }): Promise<Card> => {
  const transformedData = {
    ...cardData,
    initialBalance: cardData.initialBalance ? (-Math.abs(parseFloat(cardData.initialBalance))).toString() : cardData.initialBalance
  };

  const response = await fetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformedData),
  });
  if (!response.ok) throw new Error('Failed to update card');
  return response.json();
}

const deleteCard = async (id: string): Promise<void> => {
  const response = await fetch(`/api/cards/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error: any = new Error(errorData.error || "Failed to delete account");
    if (errorData.transactionCount) {
      error.transactionCount = errorData.transactionCount;
    }
    throw error;
  }
} 

export const useCardsQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: cards = [],
    isPending,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.cards,
    queryFn: fetchCards,
    staleTime: 5 * 60 * 1000,
  });

  const createCardMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
    },
  });

  const deletecardMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['netWorth'] });
      queryClient.invalidateQueries({ queryKey: ['netWorthHistory'] });
    }
  })

  return {
    cards,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createCard: createCardMutation.mutateAsync,
    updateCard: updateCardMutation.mutateAsync,
    deleteCard: deletecardMutation.mutateAsync,
    isCreating: createCardMutation.isPending,
    isUpdating: updateCardMutation.isPending,
    isDeleting: deletecardMutation.isPending,
  };
};

const fetchCard = async (id: string): Promise<Card> => {
  const response = await fetch(`/api/cards/${id}`);
  if (!response.ok) throw new Error('Failed to fetch card');
  return response.json();
}

export const useCardQuery = (id: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.card(id),
    queryFn: () => fetchCard(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    cardData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}

type CardGroup = {
  groupName: string;
  totalOutstandingBalance: number;
  totalStatementBalance: number | null;
  statementDate: number | null;
  lastStatementCalculationDate: string | null;
  cards: Card[];
};

const fetchCardGroup = async (groupName: string): Promise<CardGroup> => {
  const response = await fetch(`/api/cards/groups/${encodeURIComponent(groupName)}`);
  if (!response.ok) throw new Error('Failed to fetch card group');
  return response.json();
}

export const useCardGroupQuery = (groupName: string) => {
  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.cardGroup(groupName),
    queryFn: () => fetchCardGroup(groupName),
    enabled: !!groupName,
    staleTime: 5 * 60 * 1000,
  });

  return {
    cardGroupData: data,
    isFetching: isPending,
    error: error ? error.message : null,
  };
}
