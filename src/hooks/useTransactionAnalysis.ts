import { useInfiniteQuery } from "@tanstack/react-query";
import {
  TransactionAnalysisParams,
  TransactionAnalysisResponse,
} from "@/types/transaction-analysis";

async function fetchTransactionAnalysis(
  params: TransactionAnalysisParams,
  skip: number,
  take: number
): Promise<TransactionAnalysisResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set("type", params.type);

  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.categoryIds && params.categoryIds.length > 0)
    searchParams.set("categoryIds", params.categoryIds.join(","));
  if (params.subcategoryIds && params.subcategoryIds.length > 0)
    searchParams.set("subcategoryIds", params.subcategoryIds.join(","));
  if (params.tagIds && params.tagIds.length > 0)
    searchParams.set("tagIds", params.tagIds.join(","));
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.search) searchParams.set("search", params.search);
  searchParams.set("skip", skip.toString());
  searchParams.set("take", take.toString());

  const response = await fetch(
    `/api/reports/transaction-analysis?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transaction analysis");
  }

  return response.json();
}

interface UseTransactionAnalysisOptions {
  initialTake?: number;
}

export const useTransactionAnalysis = (
  params: TransactionAnalysisParams,
  options?: UseTransactionAnalysisOptions
) => {
  const initialTake = options?.initialTake ?? 5;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactionAnalysis", params],
    queryFn: ({ pageParam }) =>
      fetchTransactionAnalysis(
        params,
        pageParam,
        pageParam === 0 ? initialTake : 10
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore
        ? allPages.reduce((sum, page) => sum + page.transactions.length, 0)
        : undefined,
    enabled: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pages = data?.pages ?? [];
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];

  const combinedData: TransactionAnalysisResponse | null = firstPage
    ? {
        type: firstPage.type,
        totalAmount: firstPage.totalAmount,
        transactionCount: firstPage.transactionCount,
        breakdown: firstPage.breakdown,
        breakdownBy: firstPage.breakdownBy,
        transactions: pages.flatMap((page) => page.transactions),
        hasMore: lastPage.hasMore,
      }
    : null;

  return {
    data: combinedData,
    isLoading,
    isFetching,
    isFetchingMore: isFetchingNextPage,
    error: error ? (error as Error).message : null,
    refetch,
    fetchNextPage,
  };
};
