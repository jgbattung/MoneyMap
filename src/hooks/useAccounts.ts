import { useEffect, useState } from 'react'

type Account = {
  id: string;
  name: string;
  accountType: string;
  currentBalance: string;
  initialBalance: string;
  addToNetWorth: boolean;
};

const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    };

    fetchAccounts()
  }, []);

  return { accounts, isLoading, error }
}

export default useAccounts