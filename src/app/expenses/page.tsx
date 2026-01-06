"use client"

import CreateExpenseTransactionDrawer from "@/components/forms/CreateExpenseTransactionDrawer";
import CreateExpenseTransactionSheet from "@/components/forms/CreateExpenseTransactionSheet";
import EditExpenseDrawer from "@/components/forms/EditExpenseDrawer";
import { Icons } from "@/components/icons";
import ExpenseCard from "@/components/shared/ExpenseCard";
import SkeletonIncomeTypeCard from "@/components/shared/SkeletonIncomeTypeCard";
import SkeletonTable from "@/components/shared/SkeletonTable";
import ExpenseTable from "@/components/tables/expenses/ExpenseTable";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchIcon } from "lucide-react";
import { useExpenseTransactionsQuery } from "@/hooks/useExpenseTransactionsQuery";
import { useState, useEffect } from "react";

const ITEMS_PER_LOAD = 15;

const dateFilterOptions = {
  viewAll: "view-all",
  thisMonth: "this-month",
  thisYear: "this-year",
};

const Expenses = () => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(dateFilterOptions.viewAll);
  
  // Pass search and dateFilter to the hook
  const { expenseTransactions, hasMore, isLoading, error } = useExpenseTransactionsQuery(
    0, 
    displayCount,
    debouncedSearchTerm,
    dateFilter
  );
  
  // Drawer/Sheet states
  const [createExpenseSheetOpen, setCreateExpenseSheetOpen] = useState(false);
  const [createExpenseDrawerOpen, setCreateExpenseDrawerOpen] = useState(false);
  const [editExpenseDrawerOpen, setEditExpenseDrawerOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');

  // Debounce effect - increased to 500ms to prevent triggering on slow backspace
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset displayCount when search or filter changes
  useEffect(() => {
    if (debouncedSearchTerm || dateFilter !== dateFilterOptions.viewAll) {
      setDisplayCount(ITEMS_PER_LOAD);
    }
  }, [debouncedSearchTerm, dateFilter]);

  const handleExpenseClick = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setEditExpenseDrawerOpen(true);
  }

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  // Determine if we're currently searching/filtering
  const isFiltering = debouncedSearchTerm.length > 0 || dateFilter !== dateFilterOptions.viewAll;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6 flex flex-col">
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold'>Expenses</h1>

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
      </div>

      <EditExpenseDrawer
        open={editExpenseDrawerOpen}
        onOpenChange={setEditExpenseDrawerOpen}
        expenseId={selectedExpenseId}
      />

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
        <div className='flex-1 flex flex-col items-center justify-center py-16'>
          <Icons.wallet
            className='h-24 w-24 mb-10'
            strokeWidth={1.25}
          />
          <div className='flex flex-col px-4 items-center justify-center gap-3 text-center'>
            <p className='text-2xl min-md:text-4xl font-semibold'>No expenses, yet.</p>
            <p className='text-muted-foreground'>You have no expenses, yet! Start managing your finances by adding one.</p>
          </div>
          <Button
            onClick={() => setCreateExpenseSheetOpen(true)}
            className="hidden md:flex mt-10 text-lg px-6 py-6"
          >
            Add your first expense
          </Button>
          
          <Button
            onClick={() => setCreateExpenseDrawerOpen(true)}
            className="flex md:hidden mt-10"
          >
            Add your first expense
          </Button>
        </div>
      ) : (
        <div className="mt-10">
          <div className='md:hidden space-y-4'>
            <InputGroup>
              <InputGroupInput 
                placeholder="Search expenses..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <InputGroupAddon>
                <SearchIcon className="h-4 w-4" />
              </InputGroupAddon>
            </InputGroup>

            <ToggleGroup
              type="single"
              value={dateFilter}
              variant="outline"
              size="sm"
              onValueChange={(value) => !isLoading && value && setDateFilter(value)}
              className="justify-start"
              disabled={isLoading}
            >
              <ToggleGroupItem
                value={dateFilterOptions.viewAll}
                disabled={isLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View All
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisMonth}
                disabled={isLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisYear}
                disabled={isLoading}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                This Year
              </ToggleGroupItem>
            </ToggleGroup>

            {isLoading ? (
              <div className='grid grid-cols-1 gap-4'>
                {Array.from({ length: 4 }, (_, index) => (
                  <SkeletonIncomeTypeCard key={index} />
                ))}
              </div>
            ) : expenseTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No results found for your search.</p>
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
                    onClick={() => handleExpenseClick(expense.id)}
                  />
                ))}
                
                {!isFiltering && hasMore && (
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
    </div>
  )
}

export default Expenses