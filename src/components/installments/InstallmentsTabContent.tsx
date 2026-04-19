"use client"

import React, { useState } from 'react'
import { CalendarClock } from 'lucide-react';
import { useInstallmentsQuery } from '@/hooks/useInstallmentsQuery';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonExpenseCard } from '@/components/shared/SkeletonExpenseCard';
import SkeletonTable from '@/components/shared/SkeletonTable';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import DeleteDialog from '@/components/shared/DeleteDialog';
import EditInstallmentDrawer from '@/components/installments/EditInstallmentDrawer';
import InstallmentCard from '@/components/installments/InstallmentCard';
import InstallmentTable from '@/components/installments/InstallmentTable';

const InstallmentsTabContent = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [installmentToDelete, setInstallmentToDelete] = useState<{ id: string; name: string; paidCount: number } | null>(null);

  const { installments, isLoading, error, deleteInstallment, isDeleting } = useInstallmentsQuery({
    status: showCompleted ? 'ALL' : 'ACTIVE',
  });

  const handleEdit = (id: string) => {
    setSelectedInstallmentId(id);
    setEditDrawerOpen(true);
  };

  const handleDeleteRequest = (id: string, name: string) => {
    const installment = installments.find((i) => i.id === id);
    const duration = installment?.installmentDuration ?? 0;
    const remaining = installment?.remainingInstallments ?? 0;
    const paidCount = duration - remaining;
    setInstallmentToDelete({ id, name, paidCount });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (installmentToDelete) {
      deleteInstallment(installmentToDelete.id);
    }
    setDeleteDialogOpen(false);
    setInstallmentToDelete(null);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Switch
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={setShowCompleted}
        />
        <Label htmlFor="show-completed" className="cursor-pointer">
          Show completed
        </Label>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Icons.error className="h-24 w-24" strokeWidth={1.25} />
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl font-semibold">Failed to load installments</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <>
          <div className="md:hidden grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonExpenseCard key={i} />
            ))}
          </div>
          <div className="hidden md:block">
            <SkeletonTable tableType="expense" />
          </div>
        </>
      ) : installments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No installments yet"
          description="Installment purchases you create will appear here."
          variant="page"
        />
      ) : (
        <>
          <div className="md:hidden space-y-4">
            {installments.map((installment) => (
              <InstallmentCard
                key={installment.id}
                installment={installment}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
          <div className="hidden md:block">
            <InstallmentTable
              installments={installments}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          </div>
        </>
      )}

      <EditInstallmentDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        installmentId={selectedInstallmentId}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete installment"
        description={
          installmentToDelete
            ? `This will permanently delete this installment and all ${installmentToDelete.paidCount} payment records. This cannot be undone.`
            : undefined
        }
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default InstallmentsTabContent;
