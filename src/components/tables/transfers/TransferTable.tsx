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


const TransferTable = () => {
  const { transfers, isLoading, isUpdating, isDeleting } = useTransfersQuery();

  console.log('transfers: ', transfers);

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
        return notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
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
        pageSize: 20,
      },
    },
  })
  
  return (
    <div className='w-full space-y-4'>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
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
      </div>  
    </div>
  )
}

export default TransferTable