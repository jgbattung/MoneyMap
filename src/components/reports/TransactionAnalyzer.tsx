"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Search, ChevronDownIcon } from "lucide-react";

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
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

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
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("subcategoryId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
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

              {/* Subcategory */}
              {showSubcategory && (
                <FormField
                  control={form.control}
                  name="subcategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All subcategories" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All subcategories</SelectItem>
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
              )}

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
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All accounts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">All accounts</SelectItem>
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

        {/* Results will be added in the next task */}
        {hasAnalyzed && data && !isFetching && (
          <ResultsPanel
            data={data}
            accumulatedTransactions={accumulatedTransactions}
            setAccumulatedTransactions={setAccumulatedTransactions}
            analysisParams={analysisParams}
            setAnalysisParams={setAnalysisParams}
            form={form}
            buildParams={buildParams}
            refetch={refetch}
            isFetching={isFetching}
            categories={categories}
            tags={tags}
            accounts={accounts}
          />
        )}

        {hasAnalyzed && isFetching && !data && <LoadingSkeleton />}

        {hasAnalyzed && error && !isFetching && (
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

// Placeholder components — will be fully implemented in the next task
function ResultsPanel(props: {
  data: NonNullable<ReturnType<typeof useTransactionAnalysis>["data"]>;
  accumulatedTransactions: TransactionAnalysisTransaction[];
  setAccumulatedTransactions: React.Dispatch<
    React.SetStateAction<TransactionAnalysisTransaction[]>
  >;
  analysisParams: TransactionAnalysisParams;
  setAnalysisParams: React.Dispatch<
    React.SetStateAction<TransactionAnalysisParams>
  >;
  form: ReturnType<typeof useForm<TransactionAnalysisFormValues>>;
  buildParams: (values: TransactionAnalysisFormValues) => TransactionAnalysisParams;
  refetch: () => void;
  isFetching: boolean;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
}) {
  void props;
  return null;
}

function LoadingSkeleton() {
  return null;
}
