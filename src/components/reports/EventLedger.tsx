"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  SearchX,
  Plus,
  X,
  Search,
} from "lucide-react";

import {
  eventLedgerFormSchema,
  EventLedgerFormValues,
} from "@/lib/validations/event-ledger";
import { EventLedgerParams, EventLedgerTagAllParams } from "@/types/event-ledger";
import { TransactionAnalysisParams } from "@/types/transaction-analysis";
import { useEventLedger, useEventLedgerTag } from "@/hooks/useEventLedger";
import { useTransactionAnalysis } from "@/hooks/useTransactionAnalysis";
import { useTagsQuery } from "@/hooks/useTagsQuery";
import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/shared/EmptyState";
import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover";
import { TagInput } from "@/components/shared/TagInput";
import { cn, formatDateForAPI } from "@/lib/utils";

const ALL_VALUE = "__all__";

const DEFAULT_FORM_VALUES: EventLedgerFormValues = {
  mode: "tag",
  tagIds: [],
  startDate: null,
  endDate: null,
  accountId: "",
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function EventLedger() {
  const [ledgerParams, setLedgerParams] = useState<EventLedgerParams>({
    tagIds: [],
  });
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const form = useForm<EventLedgerFormValues>({
    resolver: zodResolver(eventLedgerFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { tags } = useTagsQuery();
  const { accounts } = useAccountsQuery();

  const { data, isFetching, isFetchingMore, error, refetch, fetchNextPage } =
    useEventLedger(ledgerParams);

  const selectedTagIds = form.watch("tagIds") ?? [];
  const mode = form.watch("mode");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const isRange = mode === "range";

  const toggleTag = (tagId: string) => {
    const current = form.getValues("tagIds") ?? [];
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    form.setValue("tagIds", next);
  };

  const buildParams = useCallback(
    (values: EventLedgerFormValues): EventLedgerParams => {
      const params: EventLedgerParams = {
        tagIds: values.mode === "range" ? [] : values.tagIds,
      };
      if (values.startDate) params.startDate = formatDateForAPI(values.startDate);
      if (values.endDate) params.endDate = formatDateForAPI(values.endDate);
      if (values.accountId) params.accountId = values.accountId;
      return params;
    },
    []
  );

  const runLedger = useCallback(
    (params: EventLedgerParams) => {
      setLedgerParams(params);
      setHasAnalyzed(true);
      setTimeout(() => refetch(), 0);
    },
    [refetch]
  );

  const handleAnalyze = useCallback(async () => {
    if (!(await form.trigger())) return;
    runLedger(buildParams(form.getValues()));
  }, [form, buildParams, runLedger]);

  const handleModeChange = useCallback(
    (value: string) => {
      // Radix single toggles emit "" when the active item is clicked again
      if (value !== "tag" && value !== "range") return;
      if (value === form.getValues("mode")) return;
      form.setValue("mode", value);
      form.clearErrors();
      setHasAnalyzed(false);
      setLedgerParams({ tagIds: [] });
      setAddPanelOpen(false);
    },
    [form]
  );

  const handleViewTagLedger = useCallback(
    (tagIds: string[]) => {
      form.reset({ ...DEFAULT_FORM_VALUES, mode: "tag", tagIds });
      setAddPanelOpen(false);
      runLedger({ tagIds });
    },
    [form, runLedger]
  );

  const handleClear = useCallback(() => {
    form.reset({ ...DEFAULT_FORM_VALUES, mode: form.getValues("mode") });
    setLedgerParams({ tagIds: [] });
    setHasAnalyzed(false);
    setAddPanelOpen(false);
  }, [form]);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const hasActiveFilters = () => {
    const values = form.getValues();
    return (
      (values.mode === "tag" && values.tagIds && values.tagIds.length > 0) ||
      values.startDate ||
      values.endDate ||
      values.accountId
    );
  };

  const totalTransactions = data
    ? data.expenseCount + data.incomeCount
    : 0;

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-sm md:text-base font-semibold">
          Event Ledger
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          See the real cost of an event by combining expenses and income under
          the same tags
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        <Form {...form}>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-3 md:space-y-4"
          >
            {/* Mode */}
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode}
              onValueChange={handleModeChange}
              className="w-full"
              aria-label="Ledger mode"
            >
              <ToggleGroupItem value="tag" className="flex-1">
                By tag
              </ToggleGroupItem>
              <ToggleGroupItem value="range" className="flex-1">
                By date range
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Tag Selection */}
            {!isRange && (
            <FormField
              control={form.control}
              name="tagIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Tags</FormLabel>
                  <MultiSelectPopover
                    options={tags}
                    selectedIds={selectedTagIds}
                    onToggle={toggleTag}
                    placeholder="Select tags"
                    itemLabel="tag"
                    searchPlaceholder="Search tags..."
                  />
                  {selectedTagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTagIds.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              borderColor: tag.color,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Optional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <Popover
                      open={startDateOpen}
                      onOpenChange={setStartDateOpen}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">
                                Start date
                              </span>
                            )}
                            <ChevronDownIcon className="h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          captionLayout="dropdown"
                          onDayClick={(date) => {
                            field.onChange(date);
                            setStartDateOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <Popover
                      open={endDateOpen}
                      onOpenChange={setEndDateOpen}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                          >
                            {field.value ? (
                              format(field.value, "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">
                                End date
                              </span>
                            )}
                            <ChevronDownIcon className="h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          captionLayout="dropdown"
                          onDayClick={(date) => {
                            field.onChange(date);
                            setEndDateOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select
                      value={field.value || ALL_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === ALL_VALUE ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All accounts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All accounts</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {hasActiveFilters() && (
                <Button type="button" variant="ghost" onClick={handleClear}>
                  Clear
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={
                  (isRange
                    ? !watchedStartDate || !watchedEndDate
                    : selectedTagIds.length === 0) || isFetching
                }
              >
                {isFetching ? (
                  <>
                    <Spinner className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "View Ledger"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Loading State — first load */}
        {hasAnalyzed && isFetching && !data && <LedgerLoadingSkeleton />}

        {/* Error State */}
        {hasAnalyzed && error && !isFetching && !data && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Results Panel */}
        {hasAnalyzed && data && (
          <div className="rounded-lg bg-muted/20 p-3 md:p-4 space-y-4 md:space-y-6">
            {/* Range summary line (submitted params) */}
            {isRange && ledgerParams.startDate && ledgerParams.endDate && (
              <p className="text-xs text-muted-foreground">
                {`${format(parseISO(ledgerParams.startDate), "MMM d")} - ${format(
                  parseISO(ledgerParams.endDate),
                  "MMM d, yyyy"
                )} · ${
                  accounts.find((a) => a.id === ledgerParams.accountId)?.name ??
                  "All accounts"
                }`}
              </p>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-numeric text-lg md:text-xl font-bold text-text-error">
                  {formatCurrency(data.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-numeric text-lg md:text-xl font-bold text-text-success">
                  {formatCurrency(data.totalIncome)}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {data.netAmount >= 0 ? "Net Cost" : "Net Gain"}
                </p>
                <p
                  className={cn(
                    "text-numeric text-lg md:text-xl font-bold",
                    data.netAmount >= 0 ? "text-text-error" : "text-text-success"
                  )}
                >
                  {formatCurrency(Math.abs(data.netAmount))}
                </p>
              </div>
            </div>

            {/* Summary Sentence */}
            {totalTransactions > 0 && (
              <p className="text-sm text-muted-foreground">
                You spent{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(data.totalExpenses)}
                </span>{" "}
                and received{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(data.totalIncome)}
                </span>{" "}
                across{" "}
                <span className="font-medium text-foreground">
                  {totalTransactions} transaction
                  {totalTransactions !== 1 ? "s" : ""}
                </span>{" "}
                &mdash;{" "}
                {data.netAmount >= 0 ? "net cost" : "net gain"} of{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(Math.abs(data.netAmount))}
                </span>
              </p>
            )}

            {/* Tag all (range mode) */}
            {isRange &&
              totalTransactions > 0 &&
              ledgerParams.startDate &&
              ledgerParams.endDate && (
                <TagAllBar
                  key={JSON.stringify([
                    ledgerParams.startDate,
                    ledgerParams.endDate,
                    ledgerParams.accountId,
                  ])}
                  filter={{
                    startDate: ledgerParams.startDate,
                    endDate: ledgerParams.endDate,
                    ...(ledgerParams.accountId
                      ? { accountId: ledgerParams.accountId }
                      : {}),
                  }}
                  count={totalTransactions}
                  onViewTagLedger={handleViewTagLedger}
                />
              )}

            {/* Transaction List or Empty State */}
            {totalTransactions === 0 ? (
              <EmptyState
                variant="widget"
                icon={SearchX}
                title="No transactions found"
                description={
                  isRange
                    ? "No income or expense transactions in this range."
                    : "No transactions have these tags yet. Search your history and tag them below."
                }
                action={
                  isRange
                    ? undefined
                    : {
                        label: "Find & tag transactions",
                        onClick: () => setAddPanelOpen(true),
                      }
                }
              />
            ) : (
              <div>
                <div>
                  {data.transactions.map((t) => (
                    <div
                      key={`${t.type}-${t.id}`}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              t.type === "expense"
                                ? "text-text-error"
                                : "text-text-success"
                            }
                          >
                            {t.type === "expense" ? "−" : "+"}
                          </span>
                          <p className="text-sm font-medium">{t.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          {t.categoryName}
                          {t.subcategoryName
                            ? ` > ${t.subcategoryName}`
                            : ""}{" "}
                          &middot; {t.accountName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-numeric text-sm font-medium",
                            t.type === "expense"
                              ? "text-text-error"
                              : "text-text-success"
                          )}
                        >
                          {t.type === "expense" ? "−" : "+"}
                          {formatCurrency(t.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {isFetchingMore && (
                  <div className="space-y-1 mt-1">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-[52px] w-full" />
                    ))}
                  </div>
                )}
                {data.hasMore && (
                  <div className="flex justify-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isFetchingMore}
                    >
                      {isFetchingMore ? (
                        <>
                          <Spinner className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Add Transactions Button */}
            {!isRange && (
            <div>
              {!addPanelOpen ? (
                totalTransactions > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPanelOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Transactions
                  </Button>
                )
              ) : (
                <AddTransactionsPanel
                  selectedTagIds={selectedTagIds}
                  ledgerTransactionIds={
                    data.transactions.map((t) => t.id)
                  }
                  onClose={() => setAddPanelOpen(false)}
                  onTagAdded={() => refetch()}
                />
              )}
            </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Tag all (date-range mode) ---

function TagAllBar({
  filter,
  count,
  onViewTagLedger,
}: {
  filter: EventLedgerTagAllParams["filter"];
  count: number;
  onViewTagLedger: (tagIds: string[]) => void;
}) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  const { tags } = useTagsQuery();
  const { tagAll, isTaggingAll } = useEventLedgerTag();

  // A freshly created tag has a placeholder id until the server responds
  const hasPendingTag = tagIds.some((id) => id.startsWith("optimistic-"));

  const handleTagAll = () => {
    const names = tagIds
      .map((id) => tags.find((t) => t.id === id)?.name)
      .filter(Boolean);
    tagAll(
      { filter, tagIds },
      {
        onSuccess: ({ tagged }) => {
          toast.success(
            `Tagged ${tagged} transaction${tagged === 1 ? "" : "s"} as ${names.join(", ")}`,
            {
              action: {
                label: "View tag ledger",
                onClick: () => onViewTagLedger(tagIds),
              },
            }
          );
          setTagIds([]);
        },
        onError: () => toast.error("Failed to tag transactions"),
      }
    );
  };

  return (
    <div className="rounded-lg border p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Tag all {count} as</span>
      <div className="flex-1 min-w-[200px]">
        <TagInput selectedTagIds={tagIds} onChange={setTagIds} />
      </div>
      <Button
        size="sm"
        onClick={handleTagAll}
        disabled={tagIds.length === 0 || hasPendingTag || isTaggingAll}
      >
        {isTaggingAll ? (
          <>
            <Spinner className="mr-2" />
            Tagging...
          </>
        ) : (
          `Tag all ${count}`
        )}
      </Button>
    </div>
  );
}

// --- Add Transactions Panel ---

function AddTransactionsPanel({
  selectedTagIds,
  ledgerTransactionIds,
  onClose,
  onTagAdded,
}: {
  selectedTagIds: string[];
  ledgerTransactionIds: string[];
  onClose: () => void;
  onTagAdded: () => void;
}) {
  const [searchType, setSearchType] = useState<"expense" | "income">("expense");
  const [searchStartDate, setSearchStartDate] = useState<Date | null>(null);
  const [searchEndDate, setSearchEndDate] = useState<Date | null>(null);
  const [searchCategoryId, setSearchCategoryId] = useState("");
  const [searchAccountId, setSearchAccountId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchStartDateOpen, setSearchStartDateOpen] = useState(false);
  const [searchEndDateOpen, setSearchEndDateOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set());
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(
    new Set()
  );

  const [searchParams, setSearchParams] = useState<TransactionAnalysisParams>({
    type: "expense",
  });

  const { budgets } = useExpenseTypesQuery();
  const { incomeTypes } = useIncomeTypesQuery();
  const { accounts } = useAccountsQuery();

  const { data: searchData, isFetching: isSearching, refetch: searchRefetch } =
    useTransactionAnalysis(searchParams, { initialTake: 50 });

  const { tagTransactions, isAdding } = useEventLedgerTag();

  const categories = searchType === "expense" ? budgets : incomeTypes;

  const handleSearch = () => {
    const params: TransactionAnalysisParams = {
      type: searchType,
    };
    if (searchStartDate) params.startDate = formatDateForAPI(searchStartDate);
    if (searchEndDate) params.endDate = formatDateForAPI(searchEndDate);
    if (searchCategoryId) params.categoryIds = [searchCategoryId];
    if (searchAccountId) params.accountId = searchAccountId;
    if (searchName) params.search = searchName;

    setSelectedResultIds(new Set());
    setSearchParams(params);
    setHasSearched(true);
    setTimeout(() => searchRefetch(), 0);
  };

  const toggleResultSelection = (transactionId: string) => {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  const filteredResults =
    searchData?.transactions.filter(
      (t) => !ledgerTransactionIds.includes(t.id) && !taggedIds.has(t.id)
    ) ?? [];

  const allResultsSelected =
    filteredResults.length > 0 &&
    filteredResults.every((t) => selectedResultIds.has(t.id));

  const toggleSelectAll = () => {
    setSelectedResultIds(
      allResultsSelected
        ? new Set()
        : new Set(filteredResults.map((t) => t.id))
    );
  };

  const handleTagSelected = () => {
    if (selectedTagIds.length === 0 || selectedResultIds.size === 0) return;
    const idsToTag = Array.from(selectedResultIds);
    tagTransactions(
      {
        transactionIds: idsToTag,
        transactionType: searchType,
        tagIds: selectedTagIds,
      },
      {
        onSuccess: () => {
          setTaggedIds((prev) => {
            const next = new Set(prev);
            idsToTag.forEach((id) => next.add(id));
            return next;
          });
          setSelectedResultIds(new Set());
          onTagAdded();
        },
      }
    );
  };

  return (
    <div className="rounded-lg border p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Add Transactions</p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Filters */}
      <div className="space-y-3">
        <ToggleGroup
          type="single"
          variant="outline"
          value={searchType}
          onValueChange={(value) => {
            if (value) {
              setSearchType(value as "expense" | "income");
              setSearchCategoryId("");
              setSelectedResultIds(new Set());
            }
          }}
          className="w-full"
        >
          <ToggleGroupItem value="expense" className="flex-1">
            Expense
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="flex-1">
            Income
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Date Range */}
          <Popover
            open={searchStartDateOpen}
            onOpenChange={setSearchStartDateOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
              >
                {searchStartDate ? (
                  format(searchStartDate, "MMM d, yyyy")
                ) : (
                  <span className="text-muted-foreground">From</span>
                )}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={searchStartDate ?? undefined}
                captionLayout="dropdown"
                onDayClick={(date) => {
                  setSearchStartDate(date);
                  setSearchStartDateOpen(false);
                }}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>

          <Popover
            open={searchEndDateOpen}
            onOpenChange={setSearchEndDateOpen}
            modal
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
              >
                {searchEndDate ? (
                  format(searchEndDate, "MMM d, yyyy")
                ) : (
                  <span className="text-muted-foreground">To</span>
                )}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={searchEndDate ?? undefined}
                captionLayout="dropdown"
                onDayClick={(date) => {
                  setSearchEndDate(date);
                  setSearchEndDateOpen(false);
                }}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>

          {/* Category */}
          <Select
            value={searchCategoryId || ALL_VALUE}
            onValueChange={(value) =>
              setSearchCategoryId(value === ALL_VALUE ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account */}
          <Select
            value={searchAccountId || ALL_VALUE}
            onValueChange={(value) =>
              setSearchAccountId(value === ALL_VALUE ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Name Search + Search Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-9"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching} size="sm">
            {isSearching ? <Spinner /> : "Search"}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div data-testid="search-results">
          {isSearching && !searchData ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[48px] w-full" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No matching transactions found.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-2 py-2 border-b">
                <Checkbox
                  checked={allResultsSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={toggleSelectAll}
                >
                  Select all ({filteredResults.length})
                </button>
              </div>
              {filteredResults.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 py-2 border-b last:border-b-0 cursor-pointer"
                  onClick={() => toggleResultSelection(t.id)}
                >
                  <Checkbox checked={selectedResultIds.has(t.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.categoryName}
                      {t.subcategoryName
                        ? ` > ${t.subcategoryName}`
                        : ""}{" "}
                      &middot; {t.accountName} &middot;{" "}
                      {format(new Date(t.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-numeric text-sm font-medium whitespace-nowrap ml-2">
                    {formatCurrency(t.amount)}
                  </p>
                </div>
              ))}
              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleTagSelected}
                  disabled={selectedResultIds.size === 0 || isAdding}
                  size="sm"
                >
                  {isAdding && <Spinner className="mr-2" />}
                  Tag selected ({selectedResultIds.size})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---

function LedgerLoadingSkeleton() {
  return (
    <div className="rounded-lg bg-muted/20 p-3 md:p-4 space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="space-y-1">
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-[52px] w-full" />
        <Skeleton className="h-[52px] w-full" />
      </div>
    </div>
  );
}

export default EventLedger;
