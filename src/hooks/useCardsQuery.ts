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
};

const QUERY_KEYS = {
  cards: ['cards'] as const,
  card: (id: string) => ['cards', id] as const,
}

const fetchCards = async (): Promise<Card[]> => {
  const response = await fetch('/api/cards');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
};

const createCard = async (cardData: any): Promise<Card> => {
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

const updateCard = async ({ id, ...cardData }: any): Promise<Card> => {
  const response = await fetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) throw new Error('Failed to update card');
  return response.json();
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
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cards });
    },
  });

  return {
    cards,
    isLoading: isPending,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    createCard: createCardMutation.mutateAsync,
    updateCard: updateCardMutation.mutateAsync,
    isCreating: createCardMutation.isPending,
    isUpdating: updateCardMutation.isPending,
  };
};
