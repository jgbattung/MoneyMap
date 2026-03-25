export interface TransactionAnalysisParams {
  type: "expense" | "income";
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagIds?: string[];
  accountId?: string;
  search?: string;
  skip?: number;
  take?: number;
}

export interface TransactionAnalysisBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface TransactionAnalysisTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryName: string;
  subcategoryName?: string;
  accountName: string;
}

export interface TransactionAnalysisResponse {
  type: "expense" | "income";
  totalAmount: number;
  transactionCount: number;
  breakdown: TransactionAnalysisBreakdownItem[];
  transactions: TransactionAnalysisTransaction[];
  hasMore: boolean;
}
