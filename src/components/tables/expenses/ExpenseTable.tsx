"use client"

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { ExpenseTransaction, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<ExpenseTransaction>();

const CellContent = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const columnMeta = column.columnDef.meta;
  const tableMeta = table.options.meta;
  const [value, setValue] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    setValue(initialValue)
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
          <button className="w-full text-left">
            {dateValue ? format(dateValue, "MMM d, yyyy") : "Select date"}
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
    <input
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

  return meta?.editedRows[row.id] ? (
    <div className='flex gap-2 items-center justify-center'>
      <Button variant="ghost" size="icon" onClick={removeRow}>
        <IconX />
      </Button>
      <Button variant="ghost" size="icon" onClick={saveRow}>
        <IconCheck />
      </Button>
    </div>
  ) : (
    <Button variant="ghost" size="icon" onClick={setEditedRows}>
      <IconEdit />
    </Button>
  )
}

const ExpenseTable = () => {
  const { expenseTransactions, updateExpenseTransaction, isLoading, isUpdating } = useExpenseTransactionsQuery();
  const { accounts } = useAccountsQuery();
  const { cards } = useCardsQuery();
  const { budgets } = useExpenseTypesQuery();

  const [data, setData] = useState<ExpenseTransaction[]>([]);
  const [originalData, setOriginalData] = useState<ExpenseTransaction[]>([]);
  const [editedRows, setEditedRows] = useState({});

  useEffect(() => {
    setData([...expenseTransactions]);
    setOriginalData([...expenseTransactions]);
  }, [expenseTransactions]);

  const allAccounts = [...accounts, ...cards];

  const columns = [
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
        options: allAccounts.map(acc => ({
          value: acc.id,
          label: acc.name
        }))
      },
    }),
    columnHelper.accessor("expenseTypeId", {
      header: "Expense type",
      cell: CellContent,
      meta: {
        type: "select",
        options: budgets.map(budget => ({
          value: budget.id,
          label: budget.name
        }))
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
      header: "Actions",
      id: "edit",
      cell: EditCell,
    }),
  ];

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      editedRows,
      setEditedRows,
      updateData: (rowIndex: number, columnId: string, value: string) => {
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
      },
      revertData: (rowIndex: number) => {
        setData((old) =>
          old.map((row, index) => (index === rowIndex ? originalData[rowIndex] : row))
        );
      },
      updateExpenseTransaction,
      isUpdating,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 40, 50] as const;

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
                  <TableCell key={cell.id} className='p-4'>
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
                  <p className="text-sm text-muted-foreground">Add your first expense to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
        <div>
          <p className='text-sm text-muted-foreground'>{`Showing ${table.getRowModel().rows.length} out of ${expenseTransactions.length}`}</p>
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
  )
}

export default ExpenseTable