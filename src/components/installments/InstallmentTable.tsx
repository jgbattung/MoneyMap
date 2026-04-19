"use client"

import React from 'react'
import { addDays, format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { IconEdit } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Installment } from '@/hooks/useInstallmentsQuery';

interface InstallmentTableProps {
  installments: Installment[];
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
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

const InstallmentTable = ({ installments, onEdit, onDelete }: InstallmentTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Monthly</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Start date</TableHead>
          <TableHead>Next payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {installments.map((row) => {
          const duration = row.installmentDuration ?? 0;
          const remaining = row.remainingInstallments ?? 0;
          const paid = duration - remaining;
          const percent = duration > 0 ? (paid / duration) * 100 : 0;
          const nextPayment = computeNextPayment(row);
          const isCompleted = row.installmentStatus === 'COMPLETED';

          return (
            <TableRow key={row.id}>
              <TableCell>
                <span className="font-semibold max-w-[200px] block truncate">{row.name}</span>
              </TableCell>
              <TableCell className="text-right">₱{formatCurrency(row.amount)}</TableCell>
              <TableCell className="text-right">
                ₱{row.monthlyAmount ? formatCurrency(row.monthlyAmount) : '—'}
              </TableCell>
              <TableCell>
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
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {row.installmentStartDate
                  ? format(new Date(row.installmentStartDate), "MMM d, yyyy")
                  : '—'}
              </TableCell>
              <TableCell>
                {isCompleted
                  ? '—'
                  : nextPayment
                    ? format(nextPayment, "MMM d, yyyy")
                    : '—'}
              </TableCell>
              <TableCell>
                {isCompleted ? (
                  <Badge variant="outline">Completed</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit installment"
                    onClick={() => onEdit(row.id)}
                  >
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete installment"
                    onClick={() => onDelete(row.id, row.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default InstallmentTable;
