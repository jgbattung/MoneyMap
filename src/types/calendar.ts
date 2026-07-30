export interface CalendarDayBucket {
  date: string; // "2026-07-29"
  expense: number;
  income: number;
  transfer: number;
  expenseCount: number;
  incomeCount: number;
  transferCount: number;
}

export interface CalendarSummaryResponse {
  days: CalendarDayBucket[];
  totals: { expense: number; income: number; net: number };
  max: { expense: number; income: number };
}

export interface CalendarDayTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  date: string;
  categoryName: string;
  subcategoryName?: string;
  accountName: string;
  toAccountName?: string;
  tags: { id: string; name: string; color: string }[];
}

export interface CalendarDayResponse {
  transactions: CalendarDayTransaction[];
  totals: { income: number; expense: number; net: number };
}
