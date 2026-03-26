"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Search, ChevronDownIcon, ChevronUp, X, SearchX } from "lucide-react";

import {
  transactionAnalysisFormSchema,
  TransactionAnalysisFormValues,
} from "@/lib/validations/transaction-analysis";
import {
  TransactionAnalysisParams,
  TransactionAnalysisTransaction,
} from "@/types/transaction-analysis";
import { useTransactionAnalysis } from "@/hooks/useTransactionAnalysis";
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { useTagsQuery } from "@/hooks/useTagsQuery";
import { useAccountsQuery } from "@/hooks/useAccountsQuery";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { TransactionAnalysisResponse } from "@/types/transaction-analysis";

const ALL_VALUE = "__all__";

const DEFAULT_FORM_VALUES: TransactionAnalysisFormValues = {
  type: "expense",
  startDate: null,
  endDate: null,
  categoryId: "",
  subcategoryId: "",
  tagIds: [],
  accountId: "",
  search: "",
};

export function TransactionAnalyzer() {
  const [analysisParams, setAnalysisParams] =
    useState<TransactionAnalysisParams>({ type: "expense" });
  const [accumulatedTransactions, setAccumulatedTransactions] = useState<
    TransactionAnalysisTransaction[]
  >([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevDataRef = useRef<TransactionAnalysisResponse | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const form = useForm<TransactionAnalysisFormValues>({
    resolver: zodResolver(transactionAnalysisFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchType = form.watch("type");
  const watchCategoryId = form.watch("categoryId");

  const { budgets } = useExpenseTypesQuery();
  const { incomeTypes } = useIncomeTypesQuery();
  const { tags } = useTagsQuery();
  const { accounts } = useAccountsQuery();

  const { data, isFetching, error, refetch } =
    useTransactionAnalysis(analysisParams);

  // Accumulate transactions when data changes (for load more)
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data;
      if (isLoadingMore) {
        setAccumulatedTransactions((prev) => [...prev, ...data.transactions]);
        setIsLoadingMore(false);
      } else {
        setAccumulatedTransactions(data.transactions);
      }
    }
  }, [data, isLoadingMore]);

  const categories = watchType === "expense" ? budgets : incomeTypes;
  const selectedExpenseType = budgets.find((b) => b.id === watchCategoryId);
  const subcategories =
    watchType === "expense" && watchCategoryId
      ? selectedExpenseType?.subcategories ?? []
      : [];
  const showSubcategory =
    watchType === "expense" && watchCategoryId && watchCategoryId.length > 0;

  const buildParams = useCallback(
    (values: TransactionAnalysisFormValues): TransactionAnalysisParams => {
      const params: TransactionAnalysisParams = {
        type: values.type,
        skip: 0,
        take: 5,
      };
      if (values.startDate)
        params.startDate = values.startDate.toISOString();
      if (values.endDate) params.endDate = values.endDate.toISOString();
      if (values.categoryId) params.categoryId = values.categoryId;
      if (values.subcategoryId) params.subcategoryId = values.subcategoryId;
      if (values.tagIds && values.tagIds.length > 0)
        params.tagIds = values.tagIds;
      if (values.accountId) params.accountId = values.accountId;
      if (values.search) params.search = values.search;
      return params;
    },
    []
  );

  const handleAnalyze = useCallback(() => {
    const values = form.getValues();
    const params = buildParams(values);
    setAnalysisParams(params);
    setAccumulatedTransactions([]);
    setHasAnalyzed(true);
    setTimeout(() => refetch(), 0);
  }, [form, buildParams, refetch]);

  const handleClearFilters = useCallback(() => {
    form.reset(DEFAULT_FORM_VALUES);
    setAnalysisParams({ type: "expense" });
    setAccumulatedTransactions([]);
    setHasAnalyzed(false);
  }, [form]);

  const handleLoadMore = useCallback(() => {
    const newSkip = accumulatedTransactions.length;
    const newParams = { ...analysisParams, skip: newSkip, take: 10 };
    setAnalysisParams(newParams);
    setIsLoadingMore(true);
    setTimeout(() => refetch(), 0);
  }, [accumulatedTransactions.length, analysisParams, refetch]);

  const handleRemoveFilter = useCallback(
    (filterKey: string, tagId?: string) => {
      if (filterKey === "startDate") form.setValue("startDate", null);
      else if (filterKey === "endDate") form.setValue("endDate", null);
      else if (filterKey === "categoryId") {
        form.setValue("categoryId", "");
        form.setValue("subcategoryId", "");
      } else if (filterKey === "subcategoryId")
        form.setValue("subcategoryId", "");
      else if (filterKey === "tagId" && tagId) {
        const current = form.getValues("tagIds") ?? [];
        form.setValue(
          "tagIds",
          current.filter((id) => id !== tagId)
        );
      } else if (filterKey === "accountId") form.setValue("accountId", "");
      else if (filterKey === "search") form.setValue("search", "");

      // Re-trigger analysis with updated filters
      setTimeout(() => {
        const values = form.getValues();
        const params = buildParams(values);
        setAnalysisParams(params);
        setAccumulatedTransactions([]);
        setTimeout(() => refetch(), 0);
      }, 0);
    },
    [form, buildParams, refetch]
  );

  const hasActiveFilters = () => {
    const values = form.getValues();
    return (
      values.startDate ||
      values.endDate ||
      values.categoryId ||
      values.subcategoryId ||
      (values.tagIds && values.tagIds.length > 0) ||
      values.accountId ||
      values.search
    );
  };

  // Tag toggle helper
  const toggleTag = (tagId: string) => {
    const current = form.getValues("tagIds") ?? [];
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    form.setValue("tagIds", next);
  };

  const selectedTagIds = form.watch("tagIds") ?? [];

  const tier2ActiveCount = [
    selectedTagIds.length > 0,
    !!form.watch("accountId"),
    !!form.watch("search"),
  ].filter(Boolean).length;

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="text-sm md:text-base font-semibold">
          Transaction Analyzer
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Filter and analyze your transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3 md:space-y-4">
            {/* Type Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) {
                          field.onChange(value);
                          form.setValue("categoryId", "");
                          form.setValue("subcategoryId", "");
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
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tier 1 Filters — always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value || ALL_VALUE}
                      onValueChange={(value) => {
                        field.onChange(value === ALL_VALUE ? "" : value);
                        form.setValue("subcategoryId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory — animated reveal */}
              <div className="field-reveal" data-visible={showSubcategory ? "true" : undefined}>
                <div>
                  <FormField
                    control={form.control}
                    name="subcategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <Select
                          value={field.value || ALL_VALUE}
                          onValueChange={(value) =>
                            field.onChange(value === ALL_VALUE ? "" : value)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="All subcategories" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ALL_VALUE}>All subcategories</SelectItem>
                            {subcategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* More Filters trigger — mobile only */}
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden py-2"
              onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
            >
              {moreFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              More Filters
              {tier2ActiveCount > 0 && (
                <span className="text-xs font-medium text-foreground">({tier2ActiveCount} active)</span>
              )}
            </button>

            {/* Tier 2 Filters — collapsible on mobile, always visible on desktop */}
            <div
              className="field-reveal md:!grid-rows-[1fr]"
              data-visible={moreFiltersOpen || undefined}
            >
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {/* Tags */}
                  <FormField
                    control={form.control}
                    name="tagIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
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

                  {/* Name Search */}
                  <FormField
                    control={form.control}
                    name="search"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Search by name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Transaction name..."
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {hasActiveFilters() && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Spinner className="mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Results Panel */}
        {hasAnalyzed && data && (
          <div className="space-y-6">
            {/* Active Filters Display */}
            <ActiveFilters
              form={form}
              categories={categories}
              tags={tags}
              accounts={accounts}
              onRemove={handleRemoveFilter}
            />

            {/* Empty State */}
            {data.transactionCount === 0 ? (
              <EmptyState
                variant="widget"
                icon={SearchX}
                title="No transactions found"
                description="Try adjusting your filters to find what you're looking for."
              />
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-xl md:text-2xl font-bold">
                      {formatCurrency(data.totalAmount)}
                    </p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Transactions
                    </p>
                    <p className="text-xl md:text-2xl font-bold">
                      {data.transactionCount}
                    </p>
                  </Card>
                </div>

                {/* Breakdown Section */}
                {data.breakdown.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Breakdown by{" "}
                      {analysisParams.categoryId
                        ? "Subcategory"
                        : "Category"}
                    </h3>
                    <div className="space-y-3">
                      {data.breakdown.map((item, index) => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              {item.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.amount)} ({item.percentage}%)
                            </span>
                          </div>
                          <div
                            className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: generateColor(
                                  index,
                                  data.breakdown.length
                                ),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transaction List */}
                {accumulatedTransactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Matching Transactions
                    </h3>
                    <div>
                      {accumulatedTransactions.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-3 border-b last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.categoryName}
                              {t.subcategoryName
                                ? ` > ${t.subcategoryName}`
                                : ""}{" "}
                              &mdash; {t.accountName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(t.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(t.date), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {data.hasMore && (
                      <div className="flex justify-center mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
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
              </>
            )}
          </div>
        )}

        {/* Loading State */}
        {hasAnalyzed && isFetching && !data && <LoadingSkeleton />}

        {/* Error State */}
        {hasAnalyzed && error && !isFetching && !data && (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Helper Components ---

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function generateColor(index: number, total: number): string {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 65%, 60%)`;
}

function ActiveFilters({
  form,
  categories,
  tags,
  accounts,
  onRemove,
}: {
  form: ReturnType<typeof useForm<TransactionAnalysisFormValues>>;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  onRemove: (key: string, tagId?: string) => void;
}) {
  const values = form.watch();

  return (
    <div className="flex flex-wrap gap-2">
      {/* Type badge — always shown, not removable */}
      <Badge variant="secondary">
        {values.type === "expense" ? "Expense" : "Income"}
      </Badge>

      {values.startDate && (
        <Badge variant="secondary" className="gap-1">
          From: {format(values.startDate, "MMM d, yyyy")}
          <button onClick={() => onRemove("startDate")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {values.endDate && (
        <Badge variant="secondary" className="gap-1">
          To: {format(values.endDate, "MMM d, yyyy")}
          <button onClick={() => onRemove("endDate")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {values.categoryId && (
        <Badge variant="secondary" className="gap-1">
          Category:{" "}
          {categories.find((c) => c.id === values.categoryId)?.name ??
            values.categoryId}
          <button onClick={() => onRemove("categoryId")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {values.subcategoryId && (
        <Badge variant="secondary" className="gap-1">
          Subcategory: {values.subcategoryId}
          <button onClick={() => onRemove("subcategoryId")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {values.tagIds?.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? (
          <Badge key={tagId} variant="secondary" className="gap-1">
            Tag: {tag.name}
            <button onClick={() => onRemove("tagId", tagId)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null;
      })}

      {values.accountId && (
        <Badge variant="secondary" className="gap-1">
          Account:{" "}
          {accounts.find((a) => a.id === values.accountId)?.name ??
            values.accountId}
          <button onClick={() => onRemove("accountId")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {values.search && (
        <Badge variant="secondary" className="gap-1">
          Search: {values.search}
          <button onClick={() => onRemove("search")}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      {/* Breakdown skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      {/* Transaction list skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}
