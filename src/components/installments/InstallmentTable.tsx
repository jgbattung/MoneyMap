"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { IconEdit } from '@tabler/icons-react';
import { ChevronLeft, ChevronRight, SearchIcon, SearchX } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type Installment } from '@/hooks/useInstallmentsQuery';

interface InstallmentTableProps {
  installments: Installment[];
  onEdit: (id: string) => void;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeNextPayment(row: Installment): Date | null {
  if (row.lastProcessedDate) {
    return addDays(new Date(row.lastProcessedDate), 30);
  }
  if (row.installmentStartDate) {
    return new Date(row.installmentStartDate);
  }
  return null;
}

const DATE_FILTER_OPTIONS = {
  viewAll: 'view-all',
  thisMonth: 'this-month',
  thisYear: 'this-year',
} as const;

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

const columnHelper = createColumnHelper<Installment>();

const InstallmentTable = ({ installments, onEdit }: InstallmentTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(DATE_FILTER_OPTIONS.viewAll);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    return installments.filter((row) => {
      if (dateFilter !== DATE_FILTER_OPTIONS.viewAll) {
        const now = new Date();
        const d = row.installmentStartDate ? new Date(row.installmentStartDate) : null;
        if (!d) return false;
        if (dateFilter === DATE_FILTER_OPTIONS.thisMonth) {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === DATE_FILTER_OPTIONS.thisYear) {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (!debouncedSearchTerm) return true;
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        row.name.toLowerCase().includes(searchLower) ||
        row.expenseType?.name.toLowerCase().includes(searchLower) ||
        row.expenseSubcategory?.name?.toLowerCase().includes(searchLower) ||
        row.account?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [installments, dateFilter, debouncedSearchTerm]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <span className="font-semibold max-w-[200px] block truncate">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('amount', {
      header: 'Total',
      cell: (info) => <div className="text-right">₱{formatCurrency(info.getValue())}</div>,
    }),
    columnHelper.accessor('monthlyAmount', {
      header: 'Monthly',
      cell: (info) => (
        <div className="text-right">
          {info.getValue() ? `₱${formatCurrency(info.getValue()!)}` : '—'}
        </div>
      ),
    }),
    columnHelper.accessor('installmentDuration', {
      header: 'Progress',
      cell: (info) => {
        const row = info.row.original;
        const duration = row.installmentDuration ?? 0;
        const remaining = row.remainingInstallments ?? 0;
        const paid = duration - remaining;
        const percent = duration > 0 ? (paid / duration) * 100 : 0;
        return (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="text-sm">{paid} / {duration}</span>
            <div
              role="progressbar"
              aria-valuenow={paid}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-label={`${paid} of ${duration} payments made`}
              className="h-1 w-full rounded bg-muted"
            >
              <div className="h-full rounded bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('installmentStartDate', {
      header: 'Start date',
      cell: (info) => {
        const val = info.getValue();
        return val ? format(new Date(val), 'MMM d, yyyy') : '—';
      },
    }),
    columnHelper.display({
      id: 'nextPayment',
      header: 'Next payment',
      cell: (info) => {
        const row = info.row.original;
        if (row.installmentStatus === 'COMPLETED') return '—';
        const next = computeNextPayment(row);
        return next ? format(next, 'MMM d, yyyy') : '—';
      },
    }),
    columnHelper.accessor('installmentStatus', {
      header: 'Status',
      cell: (info) =>
        info.getValue() === 'COMPLETED' ? (
          <Badge variant="outline">Completed</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: (info) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit installment"
            onClick={() => onEdit(info.row.original.id)}
          >
            <IconEdit className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ], [onEdit]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Empty-page safety: clamp to last valid page if current page is beyond bounds
  useEffect(() => {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    if (pageCount > 0 && currentPage >= pageCount) {
      table.setPageIndex(pageCount - 1);
    }
  }, [filteredData.length, table]);

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    pages.push(1);
    const currentPageDisplay = currentPage + 1;
    const rangeStart = Math.max(2, currentPageDisplay - 2);
    const rangeEnd = Math.min(totalPages - 1, currentPageDisplay + 2);
    if (rangeStart > 2) pages.push('...');
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              onValueChange={(value) => value && setDateFilter(value)}
            >
              <ToggleGroupItem
                value={DATE_FILTER_OPTIONS.viewAll}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                View all
              </ToggleGroupItem>
              <ToggleGroupItem
                value={DATE_FILTER_OPTIONS.thisMonth}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This month
              </ToggleGroupItem>
              <ToggleGroupItem
                value={DATE_FILTER_OPTIONS.thisYear}
                className="hover:bg-secondary-800 hover:text-white data-[state=on]:bg-secondary-700 data-[state=on]:text-white data-[state=on]:font-semibold px-4 py-5"
              >
                This year
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-start gap-2 justify-end">
            <div className="w-full max-w-xs">
              <InputGroup>
                <InputGroupInput
                  placeholder="Search installments..."
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

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        header.id === 'amount' || header.id === 'monthlyAmount' || header.id === 'actions'
                          ? 'p-4 text-right'
                          : 'p-4'
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="pl-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={SearchX}
                      title="No installments found"
                      description="Try adjusting your search or filters."
                      variant="table"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between space-x-2 py-4 px-4 border border-border border-t-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {`Showing ${table.getRowModel().rows.length} out of ${filteredData.length}`}
                {debouncedSearchTerm && <span className="text-primary-600"> (filtered)</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="text-muted-foreground hover:text-white transition-colors disabled:hover:text-muted-foreground"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft size={22} strokeWidth={1} />
              </button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNum, index) => {
                  const isCurrentPage = typeof pageNum === 'number' && pageNum === currentPage + 1;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (typeof pageNum === 'number') table.setPageIndex(pageNum - 1);
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
                  );
                })}
              </div>
              <button
                className="text-muted-foreground hover:text-white transition-colors disabled:hover:text-muted-foreground"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight size={22} strokeWidth={1} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">Rows per page</p>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => table.setPageSize(Number(value))}
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
    </>
  );
};

export default InstallmentTable;
