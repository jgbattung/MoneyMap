"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { ExpenseTransaction, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { ColumnDef, createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const columnHelper = createColumnHelper<ExpenseTransaction>();

const columns = [
  columnHelper.accessor("date", {
    header: "Date",
    cell: (info) => {
      const date = new Date(info.getValue());
      return format(date, "MMM d, yyyy");
    },
  }),
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
    cell: (info) => {
      const amount = parseFloat(info.getValue());
      return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
  }),
  columnHelper.accessor("account.name", {
    header: "Account",
  }),
  columnHelper.accessor("expenseType.name", {
    header: "Expense type",
  }),
  columnHelper.accessor("description", {
    header: "Description",
  }),
];

const ExpenseTable = () => {
  const { expenseTransactions, isLoading, isUpdating } = useExpenseTransactionsQuery();

  const table = useReactTable({
    data: expenseTransactions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
                  <TableHead key={header.id}>
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
                  <TableCell key={cell.id} className='py-4'>
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