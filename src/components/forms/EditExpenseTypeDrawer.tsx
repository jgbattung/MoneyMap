"use client"

import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import SkeletonEditBudgetDrawerForm from '../shared/SkeletonEditBudgetDrawerForm';
import { useExpenseTypesQuery, useExpenseTypeQuery } from '@/hooks/useExpenseTypesQuery';
import { Separator } from '../ui/separator';
import DeleteDialog from '../shared/DeleteDialog';

interface EditExpenseTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  budgetId: string;
}

const EditExpenseTypeDrawer = ({ open, onOpenChange, className, budgetId }: EditExpenseTypeDrawerProps)  => {
  const { updateBudget, isUpdating, deleteBudget, isDeleting } = useExpenseTypesQuery();
  const { budgetData, isFetching, error } = useExpenseTypeQuery(budgetId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: '',
      monthlyBudget: '',
    }
  });

  useEffect(() => {
    if (budgetData) {
      form.reset({
        name: budgetData.name,
        monthlyBudget: budgetData.monthlyBudget || ''
      });
    }
  }, [budgetData, form]);

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    try {
        const updatedBudget = await updateBudget({ id: budgetId, ...values });

      toast.success("Budget updated successfully", {
        description: `${updatedBudget.name} has been updated.`,
        duration: 5000
      });
        form.reset();
        onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update budget", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  };

  const handleDeleteClick = async () => {
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    try {
      const result = await deleteBudget(budgetId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Budget deleted successfully", {
        description: result.reassignedCount > 0 
          ? `${result.reassignedCount} transaction(s) reassigned to 'Uncategorized'.`
          : `${budgetData?.name} has been deleted.`,
      });
    } catch (error) {
      toast.error("Failed to delete budget", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
          className={`${className}`}
        >
        {isFetching ? (
          <SkeletonEditBudgetDrawerForm />
        ) : error ? (
            <>
              <DrawerHeader className='text-center'>
                <DrawerTitle className='text-xl'>Unable to load account</DrawerTitle>
                <DrawerDescription>
                  {error || 'Something went wrong while loading your account details.'}
                </DrawerDescription>
              </DrawerHeader>
              
              <DrawerFooter>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Try again
                </Button>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className="w-full hover:text-white"
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
              <DrawerHeader>
                <DrawerTitle className='text-xl'>
                  Edit budget
                </DrawerTitle>
                <DrawerDescription>
                  Update your budget details
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 min-h-0">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Budget name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Groceries, transportation, entertainment, shopping'
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyBudget"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Monthly budget</FormLabel>
                      <FormDescription>
                        Set a monthly spending limit for this category (optional).
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder='e.g., Groceries, transportation, entertainment, shopping'
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DrawerFooter className='flex-shrink-0'>
                <Button
                  type="submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating budget" : "Update budget"}
                </Button>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className='hover:text-white'
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </DrawerClose>

                <Separator className='my-2' />

                <Button
                  type='button'
                  variant='outline'
                  className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                  onClick={handleDeleteClick}
                  disabled={isUpdating || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete budget"}
                </Button>
              </DrawerFooter>

            </form>
          </Form>
        )}
        </DrawerContent>
      </Drawer>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        description={
          <>
            Are you sure you want to delete <span className="font-semibold">{budgetData?.name}</span>? 
            Any transactions using this budget will be reassigned to &apos;Uncategorized&apos;. This action cannot be undone.
          </>
        }
        title="Delete income type"
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditExpenseTypeDrawer