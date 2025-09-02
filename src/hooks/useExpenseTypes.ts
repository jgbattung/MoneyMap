import { useEffect, useState } from 'react'

type ExpenseType = {
  id: string;
  name: string;
  monthlyBudget?: string | null;
  createdAt: string;
  updatedAt: string;
}

const useExpenseTypes = () => {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenseTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/expense-types');
      if (!response.ok) throw new Error('Failed to fetch expense types');
      const data = await response.json();
      setExpenseTypes(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false);
    }
  };

  const refetchExpenseTypes = async () => {
    await fetchExpenseTypes();
  }

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  return { expenseTypes, isLoading, error, refetchExpenseTypes }
}

export default useExpenseTypes;