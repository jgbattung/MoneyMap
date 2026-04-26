export interface EventLedgerParams {
  tagIds: string[];
  startDate?: string;
  endDate?: string;
  accountId?: string;
  skip?: number;
  take?: number;
}

export interface EventLedgerTransaction {
  id: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  date: string;
  categoryName: string;
  subcategoryName?: string;
  accountName: string;
  tags: { id: string; name: string; color: string }[];
}

export interface EventLedgerResponse {
  totalExpenses: number;
  totalIncome: number;
  netAmount: number;
  expenseCount: number;
  incomeCount: number;
  transactions: EventLedgerTransaction[];
  hasMore: boolean;
}

export interface EventLedgerTagParams {
  transactionId: string;
  transactionType: "expense" | "income";
  tagId: string;
}
