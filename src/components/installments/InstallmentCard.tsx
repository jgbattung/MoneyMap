"use client"

import React from 'react'
import { addDays, format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { IconEdit } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { type Installment } from '@/hooks/useInstallmentsQuery';

interface InstallmentCardProps {
  installment: Installment;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeNextPayment(installment: Installment): Date | null {
  if (installment.lastProcessedDate) {
    return addDays(new Date(installment.lastProcessedDate), 30);
  }
  if (installment.installmentStartDate) {
    return new Date(installment.installmentStartDate);
  }
  return null;
}

const InstallmentCard = ({ installment, onEdit, onDelete }: InstallmentCardProps) => {
  const duration = installment.installmentDuration ?? 0;
  const remaining = installment.remainingInstallments ?? 0;
  const paid = duration - remaining;
  const percent = duration > 0 ? (paid / duration) * 100 : 0;
  const isCompleted = installment.installmentStatus === 'COMPLETED';
  const nextPayment = computeNextPayment(installment);

  return (
    <div
      className="money-map-card-interactive flex flex-col gap-3 cursor-pointer"
      onClick={() => onEdit(installment.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icons.addExpense size={20} className="text-primary flex-shrink-0" />
          <span className="font-semibold truncate">{installment.name}</span>
        </div>
        {isCompleted ? (
          <Badge variant="outline">Completed</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        )}
      </div>

      <p className="text-muted-foreground text-xs font-bold">
        {installment.expenseType?.name}
        {installment.expenseSubcategory ? ` > ${installment.expenseSubcategory.name}` : ''}
      </p>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">Monthly</span>
        <span>₱{installment.monthlyAmount ? formatCurrency(installment.monthlyAmount) : '—'}</span>

        <span className="text-muted-foreground">Duration</span>
        <span>{duration} months</span>

        <span className="text-muted-foreground">Progress</span>
        <div className="flex flex-col gap-1">
          <span>{paid} of {duration}</span>
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

        <span className="text-muted-foreground">Next payment</span>
        <span>
          {isCompleted
            ? '—'
            : nextPayment
              ? format(nextPayment, "MMM d, yyyy")
              : '—'}
        </span>
      </div>

      <div className="flex justify-end gap-1 pt-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Edit installment"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(installment.id);
          }}
        >
          <IconEdit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete installment"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(installment.id, installment.name);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InstallmentCard;
