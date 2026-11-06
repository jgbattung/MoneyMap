"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { TagInput } from '@/components/shared/TagInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ActiveFilterChips } from '@/components/transactions/filters/ActiveFilterChips';
import { FilterSummary } from '@/components/transactions/filters/FilterSummary';
import { TransactionFilterControl } from '@/components/transactions/filters/TransactionFilterControl';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import type { DatePreset } from '@/lib/transaction-filters';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useEditableTable } from '@/hooks/useEditableTable';
import { IncomeTransaction, useIncomeTransactionsQuery } from '@/hooks/useIncomeTransactionsQuery';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronDownIcon, ChevronLeft, ChevronRight, SearchIcon, SearchX, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery';
import { useTagsQuery } from '@/hooks/useTagsQuery';
import SkeletonTable from '@/components/shared/SkeletonTable';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateForAPI } from '@/lib/utils';

const columnHelper = createColumnHelper<IncomeTransaction>();

interface IncomeTableProps {
  accountId?: string;
}

const CellContent = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const columnMeta = column.columnDef.meta;
  const tableMeta = table.options.meta;
  const [value, setValue] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const amountRef = useRef<string | null>(initialValue != null ? String(initialValue) : null);

  useEffect(() => {
    setValue(initialValue ?? "");
    amountRef.current = initialValue != null ? String(initialValue) : null;
  }, [initialValue]);

  const onBlur = () => {
    tableMeta?.updateData(row.original.id, column.id, value)
  }

  const onSelectChange = (newValue: string) => {
    setValue(newValue);
    tableMeta?.updateData(row.original.id, column.id, newValue);
  };
  
  const onDateChange = (date: Date | undefined) => {
    if (date) {
      const dateString = formatDateForAPI(date);
      setValue(dateString);
      tableMeta?.updateData(row.original.id, column.id, dateString);
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
      return <span className="text-numeric">₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
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

  if (columnMeta?.type === "number") {
    return (
      <CurrencyInput
        className="w-full"
        value={Number(value) || 0}
        autoFocus
        onValueChange={(val) => {
          amountRef.current = val;
          setValue(val);
        }}
        onBlur={() => {
          tableMeta?.updateData(row.original.id, column.id, amountRef.current ?? value);
        }}
      />
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

const TagsCell = ({ getValue, row, table }: any) => {
  const rawTags = getValue();
  const { tags: allTags } = useTagsQuery();
  const tableMeta = table.options.meta;
  const isEditing = tableMeta?.editedRows[row.id];

  // Normalize: if updateData stored string[] (IDs), look up full objects
  const tags: { id: string; name: string; color: string }[] | undefined =
    Array.isArray(rawTags) && rawTags.length > 0 && typeof rawTags[0] === 'string'
      ? rawTags.map((id: string) => allTags.find((t: any) => t.id === id)).filter(Boolean)
      : rawTags;

  if (isEditing) {
    return (
      <div className="min-w-[180px]">
        <TagInput
          selectedTagIds={tags?.map((t: any) => t.id) || []}
          onChange={(tagIds) => {
            tableMeta?.updateData(row.original.id, "tags", tagIds);
          }}
        />
      </div>
    );
  }

  if (!tags || tags.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex flex-wrap gap-1 max-w-[150px]">
      {tags.slice(0, 2).map((tag: any) => (
        <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
          {tag.name}
        </Badge>
      ))}
      {tags.length > 2 && (
        <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
      )}
    </div>
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
    meta?.revertData(row.original.id);
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
        accountId: updatedRow.accountId,
        incomeTypeId: updatedRow.incomeTypeId,
        date: updatedRow.date,
        description: updatedRow.description,
        tagIds: Array.isArray(updatedRow.tags)
          ? typeof updatedRow.tags[0] === 'string'
            ? updatedRow.tags
            : updatedRow.tags.map((t: any) => t.id)
          : [],
      };

      await meta?.updateIncomeTransaction(updatePayload);
      meta?.clearPendingEdits(updatedRow.id);

      meta?.setEditedRows((old: any) => ({
        ...old,
        [row.id]: false,
      }));
      toast.success("Income updated successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to update income", {
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
        disabled={meta?.isUpdating || meta?.isDeleting}
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

const IncomeTable = ({ accountId }: IncomeTableProps = {}) => {
  const { preset, setPreset, filters, applyFilters, removeFilter, clearAll, queryDates, activeCount, isActive } = useTransactionFilters();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { incomeTransactions, updateIncomeTransaction, isUpdating, deleteIncomeTransaction, isDeleting, total, totalAmount } = useIncomeTransactionsQuery({ accountId, search: debouncedSearchTerm, ...queryDates, filters });
  const { accounts, isLoading: accountsLoading } = useAccountsQuery({ includeCards: true });
  const { incomeTypes, isLoading: incomeTypesLoading } = useIncomeTypesQuery();

  const { tags } = useTagsQuery();
  const { mergedData, editedRows, setEditedRows, updateData, revertData, clearPendingEdits } = useEditableTable({
    queryData: incomeTransactions,
    allTags: tags,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; name: string } | null>(null);

  // Memoize the options arrays
  const accountOptions = useMemo(() => 
    accounts.map(acc => ({
      value: acc.id,
      label: acc.name
    })), 
    [accounts]
  );

  const incomeTypeOptions = useMemo(() => 
    incomeTypes.map(incomeType => ({
      value: incomeType.id,
      label: incomeType.name
    })), 
    [incomeTypes]
  );

  const filterOptions = useMemo(
    () => ({ accounts: accounts, categories: incomeTypes, tags }),
    [accounts, incomeTypes, tags]
  );

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
    columnHelper.accessor("incomeTypeId", {
      header: "Income type",
      cell: CellContent,
      meta: {
        type: "select",
        options: incomeTypeOptions
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: CellContent,
      meta: {
        type: "text"
      },
    }),
    columnHelper.accessor("tags", {
      header: "Tags",
      cell: TagsCell,
    }),
    columnHelper.display({
      id: "edit",
      cell: EditCell,
    }),
  ], [accountOptions, incomeTypeOptions]);

  const handleDeleteConfirm = () => {
    if (!transactionToDelete) return;
    const idToDelete = transactionToDelete.id;

    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
    setEditedRows({});

    toast.success("Income transaction deleted successfully", {
      duration: 5000
    });
    deleteIncomeTransaction(idToDelete);
  };

  // Memoize the table meta object
  const tableMeta = useMemo(() => ({
    editedRows,
    setEditedRows,
    updateData,
    revertData,
    clearPendingEdits,
    updateIncomeTransaction,
    isUpdating,
    deleteIncomeTransaction,
    isDeleting,
    setDeleteDialogOpen,
    setTransactionToDelete,
  }), [editedRows, setEditedRows, updateData, revertData, clearPendingEdits, updateIncomeTransaction, isUpdating, deleteIncomeTransaction, isDeleting]);

  const table = useReactTable({
    data: mergedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    meta: tableMeta,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Empty-page safety: clamp to last valid page if current page is beyond bounds
  useEffect(() => {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    if (pageCount > 0 && currentPage >= pageCount) {
      table.setPageIndex(pageCount - 1);
    }
  }, [mergedData.length, table]);

  const isLoadingData = accountsLoading || incomeTypesLoading;

  if (isLoadingData) {
    return (
      <div className="md:block mt-10">
        <SkeletonTable tableType='income' />
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
              value={preset ?? ''}
              onValueChange={(value) => value && setPreset(value as DatePreset)}
            >
              <ToggleGroupItem
                value="view-all"
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                View all
              </ToggleGroupItem>
              <ToggleGroupItem
                value="this-week"
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This week
              </ToggleGroupItem>
              <ToggleGroupItem
                value="this-month"
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This month
              </ToggleGroupItem>
              <ToggleGroupItem
                value="this-year"
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This year
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Search */}
          <div className="flex items-start gap-2 justify-end">
            <TransactionFilterControl
              kind="income"
              variant="desktop"
              filters={filters}
              activeCount={activeCount}
              onApply={applyFilters}
              options={filterOptions}
              hideAccount={!!accountId}
            />
            <div className="w-full max-w-xs">
              <InputGroup>
                <InputGroupInput
                  placeholder='Search income...'
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

        <ActiveFilterChips
          kind="income"
          filters={filters}
          options={filterOptions}
          onRemove={removeFilter}
          onClearAll={clearAll}
        />
        {(isActive || debouncedSearchTerm) && (
          <FilterSummary kind="income" total={total} totalAmount={totalAmount} />
        )}

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
                  <TableCell colSpan={columns.length}>
                    <EmptyState
                      icon={SearchX}
                      title="No income found"
                      description="Try adjusting your search or filters."
                      variant="table"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
            <div>
              <p className='text-sm text-muted-foreground'>
                {`Showing ${table.getRowModel().rows.length} out of ${mergedData.length}`}
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
        title="Delete Income Transaction"
        itemName={transactionToDelete?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default IncomeTable