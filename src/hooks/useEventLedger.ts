import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  EventLedgerParams,
  EventLedgerResponse,
  EventLedgerTagParams,
} from "@/types/event-ledger";

const PAGE_SIZE = 10;

async function fetchEventLedger(
  params: EventLedgerParams,
  skip: number,
  take: number
): Promise<EventLedgerResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set("tagIds", params.tagIds.join(","));

  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.accountId) searchParams.set("accountId", params.accountId);
  searchParams.set("skip", skip.toString());
  searchParams.set("take", take.toString());

  const response = await fetch(
    `/api/reports/event-ledger?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch event ledger");
  }

  return response.json();
}

async function tagTransactions(params: EventLedgerTagParams): Promise<void> {
  const response = await fetch("/api/reports/event-ledger/tag", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to add tag to transaction");
  }
}

export const useEventLedger = (params: EventLedgerParams) => {
  const {
    data,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["eventLedger", params],
    queryFn: ({ pageParam }) => fetchEventLedger(params, pageParam, PAGE_SIZE),
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

  const combinedData: EventLedgerResponse | null = firstPage
    ? {
        totalExpenses: firstPage.totalExpenses,
        totalIncome: firstPage.totalIncome,
        netAmount: firstPage.netAmount,
        expenseCount: firstPage.expenseCount,
        incomeCount: firstPage.incomeCount,
        transactions: pages.flatMap((page) => page.transactions),
        hasMore: lastPage.hasMore,
      }
    : null;

  return {
    data: combinedData,
    isFetching,
    isFetchingMore: isFetchingNextPage,
    error: error ? (error as Error).message : null,
    refetch,
    fetchNextPage,
  };
};

export const useEventLedgerTag = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: tagTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventLedger"] });
    },
  });

  return {
    tagTransactions: mutate,
    isAdding: isPending,
  };
};
