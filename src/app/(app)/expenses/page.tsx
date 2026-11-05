"use client"

import CreateExpenseTransactionDrawer from "@/components/forms/CreateExpenseTransactionDrawer";
import CreateExpenseTransactionSheet from "@/components/forms/CreateExpenseTransactionSheet";
import EditExpenseDrawer from "@/components/forms/EditExpenseDrawer";
import { Icons } from "@/components/icons";
import ExpenseCard from "@/components/shared/ExpenseCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonExpenseCard } from "@/components/shared/SkeletonExpenseCard";
import SkeletonTable from "@/components/shared/SkeletonTable";
import ExpenseTable from "@/components/tables/expenses/ExpenseTable";
import InstallmentsTabContent from "@/components/installments/InstallmentsTabContent";
import { Button } from "@/components/ui/button";
import { MobileFilterBar } from "@/components/transactions/filters/MobileFilterBar";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { useExpenseFilterOptions } from "@/hooks/useTransactionFilterOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt } from "lucide-react";
import { useExpenseTransactionsQuery } from "@/hooks/useExpenseTransactionsQuery";
import { useState, useEffect } from "react";

const ITEMS_PER_LOAD = 15;

const Expenses = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const filterState = useTransactionFilters();
  const { preset, filters, queryDates, isActive } = filterState;
  const filterOptions = useExpenseFilterOptions();

  // Pass search and dateFilter to the hook
  const { expenseTransactions, hasMore, isLoading, isFetchingMore, error, total, totalAmount } = useExpenseTransactionsQuery({
    skip: 0,
    take: displayCount,
    search: debouncedSearchTerm,
    ...queryDates,
    filters,
  });

  // Drawer/Sheet states
  const [createExpenseSheetOpen, setCreateExpenseSheetOpen] = useState(false);
  const [createExpenseDrawerOpen, setCreateExpenseDrawerOpen] = useState(false);
  const [editExpenseDrawerOpen, setEditExpenseDrawerOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');

  // Debounce effect — 500ms delay, min 2 chars before firing (clears on empty)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset displayCount when search or filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD);
  }, [debouncedSearchTerm, preset, filters]);

  const handleExpenseClick = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setEditExpenseDrawerOpen(true);
  }

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  // Determine if we're currently searching/filtering
  const isFiltering = debouncedSearchTerm.length > 0 || isActive;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-36 md:pb-6 flex flex-col">
      <PageHeader
        title="Expenses"
        actions={
          <>
            <button
              onClick={() => setCreateExpenseSheetOpen(true)}
              className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
            >
              <Icons.createAccount size={20} />
              <span>Add expense</span>
            </button>
            <button
              onClick={() => setCreateExpenseDrawerOpen(true)}
              className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
            >
              <Icons.createAccount size={16} />
              <span>Add expense</span>
            </button>
          </>
        }
      />
      <CreateExpenseTransactionSheet
        open={createExpenseSheetOpen}
        onOpenChange={setCreateExpenseSheetOpen}
        className='hidden md:block'
      />
      <CreateExpenseTransactionDrawer
        open={createExpenseDrawerOpen}
        onOpenChange={setCreateExpenseDrawerOpen}
        className="block md:hidden"
      />

      <EditExpenseDrawer
        open={editExpenseDrawerOpen}
        onOpenChange={setEditExpenseDrawerOpen}
        expenseId={selectedExpenseId}
      />

      <Tabs defaultValue="transactions" className="mt-2">
        <TabsList variant="line">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="installments">Installments</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {error ? (
            <div className='flex-1 flex flex-col items-center justify-center py-16'>
              <Icons.error
                className='h-24 w-24 mb-10'
                strokeWidth={1.25}
              />
              <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
                <p className='text-2xl min-md:text-4xl font-semibold'>Failed to load expenses</p>
                <p className='text-muted-foreground'>{error}</p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                className="mt-10"
              >
                Try again
              </Button>
            </div>
          ) : expenseTransactions.length === 0 && !isFiltering && !isLoading ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add your first expense to start tracking your spending."
              action={{
                label: "Add your first expense",
                onClick: () => {
                  if (window.innerWidth >= 768) {
                    setCreateExpenseSheetOpen(true);
                  } else {
                    setCreateExpenseDrawerOpen(true);
                  }
                },
              }}
              variant="page"
            />
          ) : (
            <div className="mt-2">
              <div className='md:hidden space-y-4'>
                <MobileFilterBar
                  kind="expense"
                  filterState={filterState}
                  options={filterOptions}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Search expenses..."
                  isLoading={isLoading}
                  isSearching={debouncedSearchTerm.length > 0}
                  total={total}
                  totalAmount={totalAmount}
                />

                {isLoading ? (
                  <div className='grid grid-cols-1 gap-4'>
                    {Array.from({ length: 4 }, (_, index) => (
                      <SkeletonExpenseCard key={index} />
                    ))}
                  </div>
                ) : expenseTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-muted-foreground">No transactions match your filters.</p>
                  </div>
                ) : (
                  <>
                    {expenseTransactions.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        id={expense.id}
                        name={expense.name}
                        amount={expense.amount}
                        date={expense.date}
                        description={expense.description}
                        account={{
                          id: expense.account.id,
                          name: expense.account.name,
                        }}
                        expenseType={{
                          id: expense.expenseType.id,
                          name: expense.expenseType.name
                        }}
                        expenseSubcategory={expense.expenseSubcategory || null}
                        isInstallment={expense.isInstallment}
                        installmentDuration={expense.installmentDuration}
                        remainingInstallments={expense.remainingInstallments}
                        installmentStartDate={expense.installmentStartDate}
                        monthlyAmount={expense.monthlyAmount}
                        tags={expense.tags}
                        onClick={() => handleExpenseClick(expense.id)}
                      />
                    ))}

                    {isFetchingMore && (
                      <div className='grid grid-cols-1 gap-4 mt-4'>
                        {Array.from({ length: 3 }, (_, index) => (
                          <SkeletonExpenseCard key={index} />
                        ))}
                      </div>
                    )}

                    {hasMore && !isFetchingMore && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={handleLoadMore}
                      >
                        Load More
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="hidden md:block">
                {isLoading ? (
                  <SkeletonTable tableType="expense" />
                ) : (
                  <ExpenseTable />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="installments">
          <InstallmentsTabContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Expenses
