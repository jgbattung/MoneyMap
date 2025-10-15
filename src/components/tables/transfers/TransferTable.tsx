"use client"

import { Table } from '@/components/ui/table';
import { useTransfersQuery } from '@/hooks/useTransferTransactionsQuery'
import React, { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
  getSortedRowModel,
  SortingState,
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
import { useTransferTypesQuery } from '@/hooks/useTransferTypesQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import EditableDateCell from '../cells/EditableDateCell';
import EditableNotesCell from '../cells/EditableNotesCell';
import EditableNumberCell from '../cells/EditableNumberCell';
import EditableSelectCell from '../cells/EditableSelectCell';
import EditableTextCell from '../cells/EditableTextCell';
import { Button } from '@/components/ui/button';
import { IconCheck, IconTrash, IconX } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/spinner';
import DeleteDialog from '@/components/shared/DeleteDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


const TransferTable = () => {
  const { transfers, isLoading, isUpdating, isDeleting, updateTransfer , deleteTransfer } = useTransfersQuery();
  const { accounts } = useAccountsQuery();
  const { transferTypes } = useTransferTypesQuery();
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: 'date',
      desc: true,
    },
  ]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [transferToDelete, setTransferToDelete] = React.useState<string | null>(null);

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

  type EditState = {
    [rowId: string]: {
      [columnId: string]: any;
    };
  };

  const [editingCells, setEditingCells] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<EditState>({});

  const getCellKey = (rowId: string, columnId: string) => `${rowId}-${columnId}`;

  const isCellEditing = (rowId: string, columnId: string) => {
    return editingCells.has(getCellKey(rowId, columnId));
  }

  const isRowEditing = (rowId: string) => {
    return Array.from(editingCells).some(key => key.startsWith(`${rowId}-`));
  }

  const startEditingCell = (rowId: string, columnId: string, initialValue: any) => {
    const cellKey = getCellKey(rowId, columnId);
    setEditingCells(prev => new Set(prev).add(cellKey));
    setEditValues(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [columnId]: initialValue,
      },
    }));
  }

  const updateEditValue = (rowId: string, columnId: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [columnId]: value,
      },
    }));
  }

  const cancelEditing = (rowId: string) => {
    setEditingCells(prev => {
      const newSet = new Set(prev);
      Array.from(newSet).forEach(key => {
        if (key.startsWith(`${rowId}-`)) {
          newSet.delete(key);
        }
      });
      return newSet;
    })
  }

  // Validation function
  const validateRow = (rowId: string, originalData: TransferTransaction) => {
    const editedValues = editValues[rowId] || {};
    
    // Get current values (edited or original)
    const currentName = editedValues.name ?? originalData.name;
    const currentAmount = editedValues.amount ?? originalData.amount;
    const currentFromAccountId = editedValues.fromAccountId ?? originalData.fromAccountId;
    const currentToAccountId = editedValues.toAccountId ?? originalData.toAccountId;
    const currentTransferTypeId = editedValues.transferTypeId ?? originalData.transferTypeId;
    const currentDate = editedValues.date ?? originalData.date;

    const errors: string[] = [];

    // Validation rules
    if (!currentName || currentName.trim() === '') errors.push('Name');
    if (!currentAmount || currentAmount <= 0) errors.push('Amount');
    if (!currentFromAccountId) errors.push('From Account');
    if (!currentToAccountId) errors.push('To Account');
    if (!currentTransferTypeId) errors.push('Transfer Type');
    if (!currentDate) errors.push('Date');
    if (currentFromAccountId === currentToAccountId) errors.push('From and To accounts must be different');

    return errors;
  };
  
  const handleSave = async (rowId: string, originalData: TransferTransaction) => {
    const editedValues = editValues[rowId];
    
    if (!editedValues) {
      cancelEditing(rowId);
      return;
    }

    const updatePayload = {
      id: originalData.id,
      name: originalData.name,
      amount: originalData.amount,
      fromAccountId: originalData.fromAccountId,
      toAccountId: originalData.toAccountId,
      transferTypeId: originalData.transferTypeId,
      date: originalData.date,
      notes: originalData.notes,
      ...editedValues,
    };

    try {
      await updateTransfer(updatePayload);
      cancelEditing(rowId);
    } catch (error) {
      console.error('Failed to update transfer:', error);
    }
  };

  const handleDelete = async (transferId: string) => {
    setTransferToDelete(transferId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!transferToDelete) return;
    
    try {
      await deleteTransfer(transferToDelete);
      setDeleteDialogOpen(false);
      setTransferToDelete(null);
    } catch (error) {
      console.error('Failed to delete transfer:', error);
    }
  };

  const columns: ColumnDef<TransferTransaction>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "date";
        const currentValue = isCellEditing(rowId, cellId) 
          ? new Date(editValues[rowId]?.[cellId] || row.original.date)
          : new Date(row.original.date);

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('Date');

        return (
          <EditableDateCell
            value={currentValue}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.date)}
            onChange={(value) => updateEditValue(rowId, cellId, value.toISOString())}
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "name";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.name
          : row.original.name;

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('Name');

        return (
          <EditableTextCell
            value={currentValue}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.name)}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "amount";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.amount
          : row.original.amount;

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('Amount');

        return (
          <EditableNumberCell
            value={currentValue}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.amount)}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "fromAccount",
      header: "From Account",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "fromAccountId";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.fromAccountId
          : row.original.fromAccountId;
        
        const toAccountId = editValues[rowId]?.["toAccountId"] || row.original.toAccountId;
        const filteredAccounts = accounts?.filter(acc => acc.id !== toAccountId) || [];

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('From Account') || errors.includes('From and To accounts must be different');

        return (
          <EditableSelectCell
            value={currentValue}
            displayValue={row.original.fromAccount?.name || '-'}
            options={filteredAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.fromAccountId)}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
            placeholder="Select account"
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "toAccount",
      header: "To Account",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "toAccountId";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.toAccountId
          : row.original.toAccountId;
        
        const fromAccountId = editValues[rowId]?.["fromAccountId"] || row.original.fromAccountId;
        const filteredAccounts = accounts?.filter(acc => acc.id !== fromAccountId) || [];

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('To Account') || errors.includes('From and To accounts must be different');

        return (
          <EditableSelectCell
            value={currentValue}
            displayValue={row.original.toAccount?.name || '-'}
            options={filteredAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.toAccountId)}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
            placeholder="Select account"
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "transferType",
      header: "Transfer Type",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "transferTypeId";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.transferTypeId
          : row.original.transferTypeId;

        // Validation
        const errors = validateRow(rowId, row.original);
        const hasError = errors.includes('Transfer Type');

        return (
          <EditableSelectCell
            value={currentValue}
            displayValue={row.original.transferType?.name || '-'}
            options={transferTypes?.map(type => ({ value: type.id, label: type.name })) || []}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.transferTypeId)}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
            placeholder="Select type"
            isError={hasError}
          />
        );
      }
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const rowId = row.id;
        const cellId = "notes";
        const currentValue = isCellEditing(rowId, cellId)
          ? editValues[rowId]?.[cellId] || row.original.notes
          : row.original.notes;

        return (
          <EditableNotesCell
            value={currentValue}
            isEditing={isCellEditing(rowId, cellId)}
            onStartEdit={() => startEditingCell(rowId, cellId, row.original.notes || '')}
            onChange={(value) => updateEditValue(rowId, cellId, value)}
          />
        );
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rowId = row.id;
        const isEditing = isRowEditing(rowId);

        if (isEditing) {
          const errors = validateRow(rowId, row.original);
          const hasErrors = errors.length > 0;

          return (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        className='bg-primary-600 hover:bg-primary-700 transition-colors'
                        onClick={() => handleSave(rowId, row.original)}
                        disabled={isUpdating || hasErrors}
                      >
                        {isUpdating ? (
                          <Spinner />
                        ) : (
                          <IconCheck />
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {hasErrors && (
                    <TooltipContent>
                      <p className="text-sm">
                        {errors.length > 1 
                          ? `Please fix the following fields: ${errors.join(', ')}` 
                          : `Please fix the following field: ${errors[0]}`
                        }
                      </p>                    
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                size="sm"
                className='border border-secondary-400/50 rounded-md bg-transparent hover:bg-secondary-500 hover:text-white transition-colors'
                onClick={() => cancelEditing(rowId)}
                disabled={isUpdating}
              >
                <IconX />
              </Button>
              <Button
                size="sm"
                className='bg-error-800 hover:bg-error-900 transition-colors'
                onClick={() => handleDelete(row.original.id)}
                disabled={isDeleting || isUpdating}
              >
                <IconTrash />
              </Button>
            </div>
          );
        }

        return (
          <Button
            size="sm"
            className='bg-error-700 hover:bg-error-800 transition-colors'
            onClick={() => handleDelete(row.original.id)}
            disabled={isDeleting}
          >
            <IconTrash />
          </Button>
        );
      }
    }
  ]

  const table = useReactTable({
    data: transfers || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },                                        
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-36">
                  <div className="flex items-center justify-center">
                    <Spinner className="size-6" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className={isRowEditing(row.id) ? 'bg-secondary/50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='px-4'>
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
                    <p className="text-sm text-muted-foreground">Create your first transfer to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
          <div>
            <p className='text-sm text-muted-foreground'>{`Showing ${table.getRowModel().rows.length} out of ${transfers.length}`}</p>
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
      
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Transfer Transaction?"
        description="This will permanently delete this transfer and reverse the balance changes. This action cannot be undone."
        isDeleting={isDeleting}
      />
    </div>
  )
}

export default TransferTable