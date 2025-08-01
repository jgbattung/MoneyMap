import { useEffect, useState } from "react";

type Card = {
  id: string;
  name: string;
  accountType: string;
  currentBalance: string;
  initialBalance: string;
  addToNetWorth: boolean;
  statementDate: number;
  dueDate: number;
};

const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/cards');
      if (!response.ok) throw new Error('Failed to fetch cards');
      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false);
    }
  };

  const refetchCards = async () => {
    await fetchCards();
  }

  useEffect(() => {
    fetchCards();
  }, []);

  return { cards, isLoading, error, refetchCards }
}

export default useCards
