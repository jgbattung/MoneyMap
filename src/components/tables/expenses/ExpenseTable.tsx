"use client"

import DeleteDialog from '@/components/shared/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { ExpenseTransaction, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronLeft, ChevronRight, SearchIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<ExpenseTransaction>();

const CellContent = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const columnMeta = column.columnDef.meta;
  const tableMeta = table.options.meta;
  const [value, setValue] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    setValue(initialValue ?? "")
  }, [initialValue]);

  const onBlur = () => {
    tableMeta?.updateData(row.index, column.id, value)
  }

  const onSelectChange = (newValue: string) => {
    setValue(newValue);
    tableMeta?.updateData(row.index, column.id, newValue);
    
    if (column.id === "expenseTypeId") {
      tableMeta?.updateData(row.index, "expenseSubcategoryId", "");
    }
  };
  
  const onDateChange = (date: Date | undefined) => {
    if (date) {
      const isoDate = date.toISOString();
      setValue(isoDate);
      tableMeta?.updateData(row.index, column.id, isoDate);
      setCalendarOpen(false);
    }
  }

  // If row is not in edit mode, show read-only display
  if (!tableMeta?.editedRows[row.id]) {
    if (columnMeta?.type === "date") {
      const dateValue = value ? new Date(value) : null;
      return <span>{dateValue ? format(dateValue, "MMM d, yyyy") : ""}</span>;
    }
    
    if (columnMeta?.type === "number") {
      const amount = parseFloat(value);
      return <span>{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    }

    if (columnMeta?.type === "select") {
      const option = columnMeta?.options?.find((opt: any) => opt.value === value);
      return <span>{option?.label || value}</span>;
    }

    if (column.id === "expenseSubcategoryId") {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const subcategory = row.original.expenseSubcategory;
      return <span>{subcategory?.name || "-"}</span>;
    }

    if (column.id === "description") {
      return (
        <span className="block max-w-[150px] truncate" title={value}>
          {value}
        </span>
      );
    }

    return <span>{value}</span>;
  }

  // If row is in edit mode, show editable fields
  if (columnMeta?.type === "date") {
    const dateValue = value ? new Date(value) : undefined;
    
    return (
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button className="w-full text-left flex items-center bg-[oklch(1_0_0_/_0.045)] gap-2 justify-between border rounded-lg px-3 py-2 hover:bg-[oklch(1_0_0_/_0.075)]">
            <span>
              {dateValue ? format(dateValue, "MMM d, yyyy") : "Select date"}
            </span>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={onDateChange}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (column.id === "expenseSubcategoryId") {
    const currentRow = table.options.data[row.index];
    const selectedExpenseTypeId = currentRow.expenseTypeId;
    
    // Find the expense type and get its subcategories
    const expenseType = tableMeta?.budgets?.find((b: any) => b.id === selectedExpenseTypeId);
    const subcategories = expenseType?.subcategories || [];
    
    // If no subcategories, show disabled field
    if (subcategories.length === 0) {
      return (
        <Input
          value="-"
          disabled
          className="w-full bg-muted cursor-not-allowed"
        />
      );
    }
    
    // Build options with a "None" option to clear selection
    // Use "__none__" as special value since empty string is not allowed
    const subcategoryOptions = [
      { value: "__none__", label: "None" },
      ...subcategories.map((sub: any) => ({
        value: sub.id,
        label: sub.name
      }))
    ];
    
    // Convert empty/null to "__none__" for the select, and vice versa
    const selectValue = value ? value : "__none__";
    
    const handleSubcategoryChange = (newValue: string) => {
      // Convert "__none__" back to empty string for storage
      const storageValue = newValue === "__none__" ? "" : newValue;
      setValue(storageValue);
      tableMeta?.updateData(row.index, column.id, storageValue);
    };
    
    return (
      <Select value={selectValue} onValueChange={handleSubcategoryChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select subcategory" />
        </SelectTrigger>
        <SelectContent>
          {subcategoryOptions.map((option: any) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (columnMeta?.type === "select") {
    return (
      <Select value={value} onValueChange={onSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {columnMeta?.options?.map((option: any) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
    />
  );
};

const EditCell = ({ row, table }: any) => {
  const meta = table.options.meta;

  const setEditedRows = (e: React.MouseEvent<HTMLButtonElement>) => {
    meta?.setEditedRows((old: any) => ({
      ...old,
      [row.id]: !old[row.id],
    }));
  }

  const removeRow = () => {
    meta?.revertData(row.index);
    meta?.setEditedRows((old: any) => ({
      ...old,
      [row.id]: !old[row.id],
    }));
  }

  const saveRow = async () => {
    try {
      const updatedRow = table.options.data[row.index];
      
      // Extract only the fields the API expects
      const updatePayload = {
        id: updatedRow.id,
        name: updatedRow.name,
        amount: updatedRow.amount,
        accountId: updatedRow.accountId,
        expenseTypeId: updatedRow.expenseTypeId,
        expenseSubcategoryId: updatedRow.expenseSubcategoryId || null,
        date: updatedRow.date,
        description: updatedRow.description,
        isInstallment: updatedRow.isInstallment,
        installmentDuration: updatedRow.installmentDuration,
        installmentStartDate: updatedRow.installmentStartDate,
        remainingInstallments: updatedRow.remainingInstallments,
      };

      await meta?.updateExpenseTransaction(updatePayload);

      meta?.setEditedRows((old: any) => ({
        ...old,
        [row.id]: false,
      }));
      toast.success("Expense updated successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to update expense", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  const handleDeleteClick = () => {
    const transaction = table.options.data[row.index];
    meta?.setTransactionToDelete({ id: transaction.id, name: transaction.name });
    meta?.setDeleteDialogOpen(true);
  }

  return meta?.editedRows[row.id] ? (
    <div className='flex gap-2 items-center justify-center'>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={saveRow}
        disabled={meta?.isUpdating}
      >
        {meta?.isUpdating ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <IconCheck />
        )}
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={removeRow}
        disabled={meta?.isUpdating || meta?.isDeleting}
      >
        <IconX />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleDeleteClick}
        disabled={meta?.isUpdating || meta?.isDeleting}
      >
        <Trash2 />
      </Button>
    </div>
  ) : (
    <Button variant="ghost" size="icon" onClick={setEditedRows}>
      <IconEdit />
    </Button>
  )
}

const ExpenseTable = () => {
  const { expenseTransactions, updateExpenseTransaction, isUpdating, deleteExpenseTransaction, isDeleting } = useExpenseTransactionsQuery();
  const { accounts } = useAccountsQuery();
  const { cards } = useCardsQuery();
  const { budgets } = useExpenseTypesQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [data, setData] = useState<ExpenseTransaction[]>([]);
  const [originalData, setOriginalData] = useState<ExpenseTransaction[]>([]);
  const [editedRows, setEditedRows] = useState({});

  const [dateFilter, setDateFilter] = useState<string>("view-all");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; name: string } | null>(null);

  const prevTransactionsRef = useRef<ExpenseTransaction[]>([]);

  useEffect(() => {
    // Only update if the data actually changed
    const hasChanged = 
      expenseTransactions.length !== prevTransactionsRef.current.length ||
      expenseTransactions.some((t, i) => t.id !== prevTransactionsRef.current[i]?.id);
    
    if (hasChanged) {
      setData([...expenseTransactions]);
      setOriginalData([...expenseTransactions]);
      prevTransactionsRef.current = expenseTransactions;
    }
  }, [expenseTransactions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoize the combined accounts array
  const allAccounts = useMemo(() => [...accounts, ...cards], [accounts, cards]);

  // Memoize the options arrays
  const accountOptions = useMemo(() => 
    allAccounts.map(acc => ({
      value: acc.id,
      label: acc.name
    })), 
    [allAccounts]
  );

  const expenseTypeOptions = useMemo(() => 
    budgets.map(budget => ({
      value: budget.id,
      label: budget.name
    })), 
    [budgets]
  );

  const dateFilterOptions = {
    viewAll: "view-all",
    thisWeek: "this-week",
    thisMonth: "this-month",
    thisYear: "this-year",
  }

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (dateFilter !== dateFilterOptions.viewAll) {
        const expenseDate = new Date(row.date);
        const now = new Date();

        if (dateFilter === dateFilterOptions.thisWeek) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (expenseDate < weekStart) return false;
        } else if (dateFilter === dateFilterOptions.thisMonth) {
          if (expenseDate.getMonth() !== now.getMonth() || 
              expenseDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === dateFilterOptions.thisYear) {
          if (expenseDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Search filter
      if (!debouncedSearchTerm) return true;
      
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        row.name.toLowerCase().includes(searchLower) ||
        row.description?.toLowerCase().includes(searchLower) ||
        row.expenseType.name.toLowerCase().includes(searchLower) ||
        row.account.name.toLowerCase().includes(searchLower) ||
        row.expenseSubcategory?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [data, dateFilter, dateFilterOptions.viewAll, dateFilterOptions.thisWeek, dateFilterOptions.thisMonth, dateFilterOptions.thisYear, debouncedSearchTerm]);

  // Memoize the columns with proper dependencies
  const columns = useMemo(() => [
    columnHelper.accessor("date", {
      header: "Date",
      cell: CellContent,
      meta: {
        type: "date"
      },
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: CellContent,
      meta: {
        type: "text"
      },
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
      cell: CellContent,
      meta: {
        type: "number"
      },
    }),
    columnHelper.accessor("accountId", {
      header: "Account",
      cell: CellContent,
      meta: {
        type: "select",
        options: accountOptions
      },
    }),
    columnHelper.accessor("expenseTypeId", {
      header: "Expense type",
      cell: CellContent,
      meta: {
        type: "select",
        options: expenseTypeOptions
      },
    }),
    columnHelper.accessor("expenseSubcategoryId", {
      header: "Subcategory",
      cell: CellContent,
      meta: {
        type: "subcategory-select"
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: CellContent,
      meta: {
        type: "text"
      },
    }),
    columnHelper.display({
      id: "edit",
      cell: EditCell,
    }),
  ], [accountOptions, expenseTypeOptions]);

  // Memoize meta functions with useCallback
  const updateData = useCallback((rowIndex: number, columnId: string, value: string) => {
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...old[rowIndex],
            [columnId]: value,
          };
        }
        return row;
      })
    );
  }, []);

  const revertData = useCallback((rowIndex: number) => {
    setData((old) =>
      old.map((row, index) => (index === rowIndex ? originalData[rowIndex] : row))
    );
  }, [originalData]);

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteExpenseTransaction(transactionToDelete.id);
      
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      setEditedRows({});
      
      toast.success("Expense transaction deleted successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete expense transaction", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  };

  // Memoize the table meta object
  const tableMeta = useMemo(() => ({
    editedRows,
    setEditedRows,
    updateData,
    revertData,
    updateExpenseTransaction,
    isUpdating,
    deleteExpenseTransaction,
    isDeleting,
    setDeleteDialogOpen,
    setTransactionToDelete,
    budgets,
  }), [editedRows, updateData, revertData, updateExpenseTransaction, isUpdating, deleteExpenseTransaction, isDeleting, budgets]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: tableMeta,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    pages.push(1);
    const currentPageDisplay = currentPage + 1;
    const rangeStart = Math.max(2, currentPageDisplay - 2);
    const rangeEnd = Math.min(totalPages - 1, currentPageDisplay + 2)

    if (rangeStart > 2) {
      pages.push('...')
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages;
  }

  const pageNumbers = getPageNumbers();

  return (
    <>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          {/* Quick filter */}
          <div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              onValueChange={(value) =>  value && setDateFilter(value)}
            >
              <ToggleGroupItem
                value={dateFilterOptions.viewAll}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                View all
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisWeek}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This week
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisMonth}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={dateFilterOptions.thisYear}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This year
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Search */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs">
              <InputGroup>
                <InputGroupInput 
                  placeholder='Search expenses...' 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className='p-4'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='pl-4'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No expense transactions found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
            <div>
              <p className='text-sm text-muted-foreground'>
                {`Showing ${table.getRowModel().rows.length} out of ${filteredData.length}`}
                {debouncedSearchTerm && <span className="text-primary-600"> (filtered)</span>}
              </p>
            </div>
            <div className='flex items-center gap-1'>
              <button
                className='text-muted-foreground hover:text-white transition-colors disabled:hover:text-muted-foreground'
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft size={22} strokeWidth={1} />
              </button>
              <div className='flex items-center gap-1'>
                {pageNumbers.map((pageNum, index) => {
                  const isCurrentPage = typeof pageNum === 'number' && pageNum === currentPage + 1;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (typeof pageNum === 'number') {
                          table.setPageIndex(pageNum - 1)
                        }
                      }}
                      disabled={typeof pageNum !== 'number'}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        isCurrentPage 
                          ? 'bg-primary-700/30 text-primary-foreground' 
                          : typeof pageNum === 'number'
                            ? 'hover:bg-primary-600/30'
                            : 'cursor-default'
                      }`}                  
                    >
                      {pageNum}
                    </button>
                  )
              })}
              </div>
              <button
                className='text-muted-foreground hover:text-white transition-colors disabled:hover:text-muted-foreground'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight size={22} strokeWidth={1} />
              </button>
            </div>
            <div className='flex items-center justify-center gap-2'>
              <p className='text-sm text-muted-foreground'>Rows per page</p>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Transaction"
        itemName={transactionToDelete?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default ExpenseTable