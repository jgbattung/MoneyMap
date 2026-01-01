"use client"

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
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronLeft, ChevronRight, SearchIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { TransferTransaction, useTransfersQuery } from '@/hooks/useTransferTransactionsQuery';
import { useTransferTypesQuery } from '@/hooks/useTransferTypesQuery';
import SkeletonTransferTable from '@/components/shared/SkeletonTransferTable';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { formatDateForAPI } from '@/lib/utils';

const columnHelper = createColumnHelper<TransferTransaction>();

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
  };
  
  const onDateChange = (date: Date | undefined) => {
    if (date) {
      const dateString = formatDateForAPI(date);
      setValue(dateString);
      tableMeta?.updateData(row.index, column.id, dateString);
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
      if (column.id === "feeAmount") {
        if (!value || value === "" || value === "0" || value === null) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        return <span>{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }

      const amount = parseFloat(value);
      return <span>{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    }

    if (columnMeta?.type === "select") {
      const option = columnMeta?.options?.find((opt: any) => opt.value === value);
      return <span>{option?.label || value}</span>;
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
      
      const updatePayload = {
        id: updatedRow.id,
        name: updatedRow.name,
        amount: updatedRow.amount,
        fromAccountId: updatedRow.fromAccountId,
        toAccountId: updatedRow.toAccountId,
        transferTypeId: updatedRow.transferTypeId,
        date: updatedRow.date,
        notes: updatedRow.notes,
        feeAmount: updatedRow.feeAmount,
      };

      await meta?.updateTransfer(updatePayload);

      meta?.setEditedRows((old: any) => ({
        ...old,
        [row.id]: false,
      }));
      toast.success("Transfer updated successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to update transfer", {
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
        disabled={meta?.isUpdating}
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

const TransferTable = () => {
  const { transfers, updateTransfer, isUpdating, deleteTransfer, isDeleting } = useTransfersQuery();
  const { accounts, isLoading: accountsLoading } = useAccountsQuery();
  const { cards, isLoading: cardsLoading } = useCardsQuery();
  const { transferTypes, isLoading: transferTypesLoading } = useTransferTypesQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [data, setData] = useState<TransferTransaction[]>([]);
  const [originalData, setOriginalData] = useState<TransferTransaction[]>([]);
  const [editedRows, setEditedRows] = useState({});

  const [dateFilter, setDateFilter] = useState<string>("view-all");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; name: string } | null>(null);

  const prevTransactionsRef = useRef<TransferTransaction[]>([]);

  useEffect(() => {
    // Only update if the data actually changed
    const hasChanged = 
      transfers.length !== prevTransactionsRef.current.length ||
      transfers.some((t, i) => t.id !== prevTransactionsRef.current[i]?.id);
    
    if (hasChanged) {
      setData([...transfers]);
      setOriginalData([...transfers]);
      prevTransactionsRef.current = transfers;
    }
  }, [transfers]);

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

  const transferTypeOptions = useMemo(() => 
    transferTypes.map(transferType => ({
      value: transferType.id,
      label: transferType.name
    })), 
    [transferTypes]
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
        const transferDate = new Date(row.date);
        const now = new Date();

        if (dateFilter === dateFilterOptions.thisWeek) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (transferDate < weekStart) return false;
        } else if (dateFilter === dateFilterOptions.thisMonth) {
          if (transferDate.getMonth() !== now.getMonth() || 
              transferDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === dateFilterOptions.thisYear) {
          if (transferDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Search filter
      if (!debouncedSearchTerm) return true;
      
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        row.name.toLowerCase().includes(searchLower) ||
        row.notes?.toLowerCase().includes(searchLower) ||
        row.transferType.name.toLowerCase().includes(searchLower) ||
        row.toAccount.name.toLowerCase().includes(searchLower) ||
        row.fromAccount.name.toLowerCase().includes(searchLower)
      );
    });
  }, [data, dateFilter, dateFilterOptions.viewAll, dateFilterOptions.thisWeek, dateFilterOptions.thisMonth, dateFilterOptions.thisYear, debouncedSearchTerm]);

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
    columnHelper.accessor("feeAmount", {
      header: "Fee",
      cell: CellContent,
      meta: {
        type: "number"
      },
    }),
    columnHelper.accessor("fromAccountId", {
      header: "From account",
      cell: CellContent,
      meta: {
        type: "select",
        options: accountOptions
      },
    }),
    columnHelper.accessor("toAccountId", {
      header: "To account",
      cell: CellContent,
      meta: {
        type: "select",
        options: accountOptions
      },
    }),
    columnHelper.accessor("transferTypeId", {
      header: "Transfer type",
      cell: CellContent,
      meta: {
        type: "select",
        options: transferTypeOptions
      },
    }),
    columnHelper.accessor("notes", {
      header: "Notes",
      cell: CellContent,
      meta: {
        type: "text"
      },
    }),
    columnHelper.display({
      id: "edit",
      cell: EditCell,
    }),
  ], [accountOptions, transferTypeOptions]);

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
      await deleteTransfer(transactionToDelete.id);
      
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      setEditedRows({});
      
      toast.success("Transfer deleted successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete transfer", {
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
    updateTransfer,
    isUpdating,
    deleteTransfer,
    isDeleting,
    setDeleteDialogOpen,
    setTransactionToDelete,
  }), [editedRows, updateData, revertData, updateTransfer, isUpdating, deleteTransfer, isDeleting]);

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

  const isLoadingData = accountsLoading || cardsLoading || transferTypesLoading;

  if (isLoadingData) {
    return (
      <div className="md:block mt-10">
        <SkeletonTransferTable />
      </div>
    );
  }

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
                  placeholder='Search transfers...' 
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
                      <p className="text-muted-foreground">No transfer transactions found.</p>
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
        title="Delete Transfer Transaction"
        itemName={transactionToDelete?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default TransferTable