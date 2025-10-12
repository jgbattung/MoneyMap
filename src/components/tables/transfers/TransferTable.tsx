"use client"

import { Table } from '@/components/ui/table';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery'
import React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
} from '@tanstack/react-table'
import { TransferTransaction } from '@/hooks/useTransferTransactionsQuery'
import { 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { flexRender } from '@tanstack/react-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';


const TransferTable = () => {
  const { transfers, isLoading, isUpdating, isDeleting } = useTransfersQuery();

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

  const columns: ColumnDef<TransferTransaction>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        return new Date(row.original.date).toLocaleDateString()
      }
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        return `${row.original.amount.toFixed(2)}`
      }
    },
    {
      accessorKey: "fromAccount",
      header: "From",
      cell: ({ row }) => {
        return row.original.fromAccount?.name || "N/A";
      }
    },
    {
      accessorKey: "toAccount",
      header: "To",
      cell: ({ row }) => {
        return row.original.toAccount?.name || "N/A";
      }
    },
    {
      accessorKey: "transferType",
      header: "Transfer Type",
      cell: ({ row }) => {
        return row.original.transferType?.name || "N/A"
      }
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const notes = row.original.notes || "";
        return notes.length > 15 ? `${notes.substring(0, 15)}...` : notes;
      }
    },
    {
      accessorKey: "actions",
      header: "Action",
      cell: ({ row }) => {
        return <div>Actions</div>
      }
    },
  ];

  const table = useReactTable({
    data: transfers || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  
  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    pages.push(1);

    // Calculate range around current page
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
    <div className='w-full space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className='px-4'>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='px-4'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
          {/* Showing */}
          <div>
            <p className='text-sm text-muted-foreground'>{`Showing ${table.getRowModel().rows.length} out of ${transfers.length}`}</p>
          </div>
          {/* Pages */}
          <div className='flex items-center gap-1'>
            <button
              className='text-muted-foreground hover:text-white transition-colors disabled:hover:text-muted-foreground'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft
                size={22}
                strokeWidth={1}
              />
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
              <ChevronRight
                size={22}
                strokeWidth={1}
              />
            </button>
          </div>
          {/* Rows */}
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
  )
}

export default TransferTable