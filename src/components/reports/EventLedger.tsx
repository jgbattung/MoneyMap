"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { EventLedgerParams } from "@/types/event-ledger";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

const DEFAULT_FORM_VALUES: EventLedgerFormValues = {
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
  const [displayCount, setDisplayCount] = useState(10);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const form = useForm<EventLedgerFormValues>({
    resolver: zodResolver(eventLedgerFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { tags } = useTagsQuery();
  const { accounts } = useAccountsQuery();

  const { data, isFetching, isFetchingMore, error, refetch } =
    useEventLedger(ledgerParams);

  const selectedTagIds = form.watch("tagIds") ?? [];

  const toggleTag = (tagId: string) => {
    const current = form.getValues("tagIds") ?? [];
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    form.setValue("tagIds", next);
  };

  const buildParams = useCallback(
    (values: EventLedgerFormValues, take: number): EventLedgerParams => {
      const params: EventLedgerParams = {
        tagIds: values.tagIds,
        skip: 0,
        take,
      };
      if (values.startDate) params.startDate = values.startDate.toISOString();
      if (values.endDate) params.endDate = values.endDate.toISOString();
      if (values.accountId) params.accountId = values.accountId;
      return params;
    },
    []
  );

  const handleAnalyze = useCallback(() => {
    const values = form.getValues();
    setDisplayCount(10);
    const params = buildParams(values, 10);
    setLedgerParams(params);
    setHasAnalyzed(true);
    setTimeout(() => refetch(), 0);
  }, [form, buildParams, refetch]);

  const handleClear = useCallback(() => {
    form.reset(DEFAULT_FORM_VALUES);
    setLedgerParams({ tagIds: [] });
    setDisplayCount(10);
    setHasAnalyzed(false);
    setAddPanelOpen(false);
  }, [form]);

  const handleLoadMore = useCallback(() => {
    const newCount = displayCount + 10;
    setDisplayCount(newCount);
    const values = form.getValues();
    const params = buildParams(values, newCount);
    setLedgerParams(params);
    setTimeout(() => refetch(), 0);
  }, [displayCount, form, buildParams, refetch]);

  const hasActiveFilters = () => {
    const values = form.getValues();
    return (
      (values.tagIds && values.tagIds.length > 0) ||
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
            {/* Tag Selection */}
            <FormField
              control={form.control}
              name="tagIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Tags</FormLabel>
                  <Popover
                    open={tagsOpen}
                    onOpenChange={setTagsOpen}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          {selectedTagIds.length > 0 ? (
                            `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""} selected`
                          ) : (
                            <span className="text-muted-foreground">
                              Select tags
                            </span>
                          )}
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tags..." />
                        <CommandList>
                          <CommandEmpty>No tags found.</CommandEmpty>
                          <CommandGroup>
                            {tags.map((tag) => (
                              <CommandItem
                                key={tag.id}
                                value={tag.name}
                                onSelect={() => toggleTag(tag.id)}
                              >
                                <Checkbox
                                  checked={selectedTagIds.includes(tag.id)}
                                  className="mr-2"
                                />
                                {tag.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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

            {/* Optional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
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
                disabled={selectedTagIds.length === 0 || isFetching}
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
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg md:text-xl font-bold text-red-500">
                  {formatCurrency(data.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg md:text-xl font-bold text-green-500">
                  {formatCurrency(data.totalIncome)}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {data.netAmount >= 0 ? "Net Cost" : "Net Gain"}
                </p>
                <p
                  className={cn(
                    "text-lg md:text-xl font-bold",
                    data.netAmount >= 0 ? "text-red-500" : "text-green-500"
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

            {/* Transaction List or Empty State */}
            {totalTransactions === 0 ? (
              <EmptyState
                variant="widget"
                icon={SearchX}
                title="No transactions found"
                description="No transactions match the selected tags."
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
                                ? "text-red-500"
                                : "text-green-500"
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
                            "text-sm font-medium",
                            t.type === "expense"
                              ? "text-red-500"
                              : "text-green-500"
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
            {totalTransactions > 0 && (
              <div>
                {!addPanelOpen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPanelOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Transactions
                  </Button>
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

  const [searchParams, setSearchParams] = useState<TransactionAnalysisParams>({
    type: "expense",
  });

  const { budgets } = useExpenseTypesQuery();
  const { incomeTypes } = useIncomeTypesQuery();
  const { accounts } = useAccountsQuery();

  const { data: searchData, isFetching: isSearching, refetch: searchRefetch } =
    useTransactionAnalysis(searchParams);

  const { addTag, isAdding } = useEventLedgerTag();

  const categories = searchType === "expense" ? budgets : incomeTypes;

  const handleSearch = () => {
    const params: TransactionAnalysisParams = {
      type: searchType,
      skip: 0,
      take: 50,
    };
    if (searchStartDate) params.startDate = searchStartDate.toISOString();
    if (searchEndDate) params.endDate = searchEndDate.toISOString();
    if (searchCategoryId) params.categoryId = searchCategoryId;
    if (searchAccountId) params.accountId = searchAccountId;
    if (searchName) params.search = searchName;

    setSearchParams(params);
    setHasSearched(true);
    setTimeout(() => searchRefetch(), 0);
  };

  const handleAddTag = (transactionId: string) => {
    if (selectedTagIds.length === 0) return;
    addTag(
      {
        transactionId,
        transactionType: searchType,
        tagId: selectedTagIds[0],
      },
      {
        onSuccess: () => {
          setTaggedIds((prev) => new Set(prev).add(transactionId));
          onTagAdded();
        },
      }
    );
  };

  const filteredResults =
    searchData?.transactions.filter(
      (t) => !ledgerTransactionIds.includes(t.id) && !taggedIds.has(t.id)
    ) ?? [];

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
        <div>
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
              {filteredResults.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
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
                  <div className="flex items-center gap-2 ml-2">
                    <p className="text-sm font-medium whitespace-nowrap">
                      {formatCurrency(t.amount)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(t.id)}
                      disabled={isAdding}
                    >
                      Add Tag
                    </Button>
                  </div>
                </div>
              ))}
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
      <div className="grid grid-cols-3 gap-3">
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
