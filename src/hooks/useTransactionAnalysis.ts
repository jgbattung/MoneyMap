import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  TransactionAnalysisParams,
  TransactionAnalysisResponse,
} from "@/types/transaction-analysis";

async function fetchTransactionAnalysis(
  params: TransactionAnalysisParams
): Promise<TransactionAnalysisResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set("type", params.type);

  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.subcategoryId)
    searchParams.set("subcategoryId", params.subcategoryId);
  if (params.tagIds && params.tagIds.length > 0)
    searchParams.set("tagIds", params.tagIds.join(","));
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.search) searchParams.set("search", params.search);
  if (params.skip !== undefined)
    searchParams.set("skip", params.skip.toString());
  if (params.take !== undefined)
    searchParams.set("take", params.take.toString());

  const response = await fetch(
    `/api/reports/transaction-analysis?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transaction analysis");
  }

  return response.json();
}

export const useTransactionAnalysis = (params: TransactionAnalysisParams) => {
  const { data, isLoading, isFetching, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["transactionAnalysis", params],
    queryFn: () => fetchTransactionAnalysis(params),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    data: data ?? null,
    isLoading,
    isFetching,
    isFetchingMore: isFetching && isPlaceholderData,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
