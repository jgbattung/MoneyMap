import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  EventLedgerParams,
  EventLedgerResponse,
  EventLedgerTagParams,
} from "@/types/event-ledger";

async function fetchEventLedger(
  params: EventLedgerParams
): Promise<EventLedgerResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set("tagIds", params.tagIds.join(","));

  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.accountId) searchParams.set("accountId", params.accountId);
  if (params.skip !== undefined)
    searchParams.set("skip", params.skip.toString());
  if (params.take !== undefined)
    searchParams.set("take", params.take.toString());

  const response = await fetch(
    `/api/reports/event-ledger?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch event ledger");
  }

  return response.json();
}

async function addTagToTransaction(params: EventLedgerTagParams): Promise<void> {
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
  const { data, isFetching, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["eventLedger", params],
    queryFn: () => fetchEventLedger(params),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    data: data ?? null,
    isFetching,
    isFetchingMore: isFetching && isPlaceholderData,
    error: error ? (error as Error).message : null,
    refetch,
  };
};

export const useEventLedgerTag = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: addTagToTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventLedger"] });
    },
  });

  return {
    addTag: mutate,
    isAdding: isPending,
  };
};
