"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Search, ChevronDownIcon, ChevronUp, SearchX } from "lucide-react";

import {
  transactionAnalysisFormSchema,
  TransactionAnalysisFormValues,
} from "@/lib/validations/transaction-analysis";
import { TransactionAnalysisParams } from "@/types/transaction-analysis";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover";
import { FilterBadge } from "@/components/shared/FilterBadge";
import { getCategoryColor } from "@/lib/chart-colors";


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
  const [summaryLabels, setSummaryLabels] = useState<{
    categoryName?: string;
    subcategoryName?: string;
    accountName?: string;
  }>({});
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
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

  const { data, isFetching, isFetchingMore, error, refetch, fetchNextPage } =
    useTransactionAnalysis(analysisParams);

  const categories = watchType === "expense" ? budgets : incomeTypes;
  const selectedExpenseType = budgets.find((b) => b.id === watchCategoryId);
  const subcategories = useMemo(
    () =>
      watchType === "expense" && watchCategoryId
        ? selectedExpenseType?.subcategories ?? []
        : [],
    [watchType, watchCategoryId, selectedExpenseType]
  );
  const showSubcategory =
    watchType === "expense" && watchCategoryId && watchCategoryId.length > 0;

  const buildParams = useCallback(
    (values: TransactionAnalysisFormValues): TransactionAnalysisParams => {
      const params: TransactionAnalysisParams = {
        type: values.type,
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

  const runAnalysis = useCallback(
    (values: TransactionAnalysisFormValues) => {
      setSummaryLabels({
        categoryName: categories.find((c) => c.id === values.categoryId)?.name,
        subcategoryName: subcategories.find((s) => s.id === values.subcategoryId)
          ?.name,
        accountName: accounts.find((a) => a.id === values.accountId)?.name,
      });
      const params = buildParams(values);
      setAnalysisParams(params);
      setHasAnalyzed(true);
      setTimeout(() => refetch(), 0);
    },
    [categories, subcategories, accounts, buildParams, refetch]
  );

  const handleAnalyze = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    runAnalysis(values);
  }, [form, runAnalysis]);

  const handleClearFilters = useCallback(() => {
    form.reset(DEFAULT_FORM_VALUES);
    setAnalysisParams({ type: "expense" });
    setSummaryLabels({});
    setHasAnalyzed(false);
  }, [form]);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

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
        runAnalysis(values);
      }, 0);
    },
    [form, runAnalysis]
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
                            if (form.getValues("endDate")) void form.trigger("endDate");
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
                            void form.trigger("endDate");
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
                  {/* Tags */}
                  <FormField
                    control={form.control}
                    name="tagIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
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
          <div className="space-y-4 md:space-y-6">
            <Separator className="my-4 md:my-6" />
            <div className="rounded-lg bg-muted/20 p-3 md:p-4 space-y-4 md:space-y-6">
            {/* Active Filters Display */}
            <ActiveFilters
              form={form}
              categories={categories}
              subcategories={subcategories}
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
                {/* Summary Sentence */}
                <p className="text-sm md:text-base text-muted-foreground">
                  You {watchType === "expense" ? "spent" : "earned"}{" "}
                  <span className="font-medium text-foreground">{formatCurrency(data.totalAmount)}</span>
                  {" "}across{" "}
                  <span className="font-medium text-foreground">{data.transactionCount} transaction{data.transactionCount !== 1 ? "s" : ""}</span>
                  {analysisParams.categoryId && (
                    <>{" "}on{" "}
                      <span className="font-medium text-foreground">
                        {summaryLabels.categoryName}
                        {analysisParams.subcategoryId && (
                          <>{" > "}{summaryLabels.subcategoryName}</>
                        )}
                      </span>
                    </>
                  )}
                  {analysisParams.accountId && (
                    <>{" "}in{" "}
                      <span className="font-medium text-foreground">
                        {summaryLabels.accountName}
                      </span>
                    </>
                  )}
                  {analysisParams.startDate && analysisParams.endDate && (
                    <>{" "}from <span className="font-medium text-foreground">{format(new Date(analysisParams.startDate), "MMM d, yyyy")}</span> to <span className="font-medium text-foreground">{format(new Date(analysisParams.endDate), "MMM d, yyyy")}</span></>
                  )}
                  {analysisParams.startDate && !analysisParams.endDate && (
                    <>{" "}since <span className="font-medium text-foreground">{format(new Date(analysisParams.startDate), "MMM d, yyyy")}</span></>
                  )}
                  {!analysisParams.startDate && analysisParams.endDate && (
                    <>{" "}up to <span className="font-medium text-foreground">{format(new Date(analysisParams.endDate), "MMM d, yyyy")}</span></>
                  )}
                </p>

                {/* Summary Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 rounded-lg border p-4">
                  <div className="flex-1 text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-numeric text-xl md:text-2xl font-bold">
                      {formatCurrency(data.totalAmount)}
                    </p>
                  </div>
                  <Separator orientation="vertical" className="mx-4 h-10 hidden sm:block" />
                  <div className="flex-1 text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">Avg / Transaction</p>
                    <p className="text-numeric text-xl md:text-2xl font-bold">
                      {formatCurrency(data.transactionCount > 0 ? data.totalAmount / data.transactionCount : 0)}
                    </p>
                  </div>
                </div>

                {/* Breakdown Section */}
                {data.breakdown.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 mt-2">
                      Breakdown by{" "}
                      {analysisParams.categoryId
                        ? "Subcategory"
                        : "Category"}
                    </h3>
                    <div className="space-y-3">
                      {data.breakdown.map((item) => (
                        <div key={item.id} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              {item.name}
                            </span>
                            <span className="text-numeric text-sm text-muted-foreground">
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
                                backgroundColor: getCategoryColor(item.id),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider between breakdown and transactions */}
                {data.breakdown.length > 0 && data.transactions.length > 0 && (
                  <Separator />
                )}

                {/* Transaction List */}
                {data.transactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 mt-2">
                      Matching Transactions
                    </h3>
                    <div>
                      {data.transactions.map((t) => (
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
                            <p className="text-numeric text-sm font-medium">
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
                      <div className="space-y-1">
                        {[...Array(Math.min(data.transactionCount - data.transactions.length, 3))].map((_, i) => (
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
                            `Load More (${data.transactionCount - data.transactions.length} remaining)`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
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

function ActiveFilters({
  form,
  categories,
  subcategories,
  tags,
  accounts,
  onRemove,
}: {
  form: ReturnType<typeof useForm<TransactionAnalysisFormValues>>;
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string }[];
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
        <FilterBadge onRemove={() => onRemove("startDate")}>
          From: {format(values.startDate, "MMM d, yyyy")}
        </FilterBadge>
      )}

      {values.endDate && (
        <FilterBadge onRemove={() => onRemove("endDate")}>
          To: {format(values.endDate, "MMM d, yyyy")}
        </FilterBadge>
      )}

      {values.categoryId && (
        <FilterBadge onRemove={() => onRemove("categoryId")}>
          Category:{" "}
          {categories.find((c) => c.id === values.categoryId)?.name ??
            values.categoryId}
        </FilterBadge>
      )}

      {values.subcategoryId && (
        <FilterBadge onRemove={() => onRemove("subcategoryId")}>
          Subcategory:{" "}
          {subcategories.find((s) => s.id === values.subcategoryId)?.name ??
            values.subcategoryId}
        </FilterBadge>
      )}

      {values.tagIds?.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? (
          <FilterBadge key={tagId} onRemove={() => onRemove("tagId", tagId)}>
            Tag: {tag.name}
          </FilterBadge>
        ) : null;
      })}

      {values.accountId && (
        <FilterBadge onRemove={() => onRemove("accountId")}>
          Account:{" "}
          {accounts.find((a) => a.id === values.accountId)?.name ??
            values.accountId}
        </FilterBadge>
      )}

      {values.search && (
        <FilterBadge onRemove={() => onRemove("search")}>
          Search: {values.search}
        </FilterBadge>
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
