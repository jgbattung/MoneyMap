"use client"

import { IncomeTypeValidation } from '@/lib/validations/income';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useIncomeTypeQuery, useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery';
import SkeletonEditIncomeTypeDrawerForm from '../shared/SkeletonEditIncomeTypeDrawerForm';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';

interface EditIncomeTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  incomeTypeId: string;
}

const EditIncomeTypeDrawer = ({ open, onOpenChange, className, incomeTypeId }: EditIncomeTypeDrawerProps) => {
  const { updateIncomeType, isUpdating, deleteIncomeType, isDeleting } = useIncomeTypesQuery();
  const { incomeTypeData, isFetching, error } = useIncomeTypeQuery(incomeTypeId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof IncomeTypeValidation>>({
    resolver: zodResolver(IncomeTypeValidation),
    defaultValues: {
      name: '',
      monthlyTarget: '',
    }
  });

  useEffect(() => {
    if (incomeTypeData) {
      form.reset({
        name: incomeTypeData.name,
        monthlyTarget: incomeTypeData.monthlyTarget || ''
      });
    }
  }, [incomeTypeData, form]);

  const onSubmit = async (values: z.infer<typeof IncomeTypeValidation>) => {
    try {
      const updatedIncomeType = await updateIncomeType({ id: incomeTypeId, ...values });

      toast.success("Income type updated successfully", {
        description: `${updatedIncomeType.name} has been updated.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update income type", {
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
      const result = await deleteIncomeType(incomeTypeId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Income type deleted successfully", {
        description: result.reassignedCount > 0 
          ? `${result.reassignedCount} transaction(s) reassigned to 'Uncategorized'.`
          : `${incomeTypeData?.name} has been deleted.`,
      });
    } catch (error) {
      toast.error("Failed to delete income type", {
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
            <SkeletonEditIncomeTypeDrawerForm />
          ) : error ? (
            <>
              <DrawerHeader className='text-center'>
                <DrawerTitle className='text-xl'>Unable to load income categorie</DrawerTitle>
                <DrawerDescription>
                  {error || 'Something went wrong while loading your income category details.'}
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
                    Edit income type
                  </DrawerTitle>
                  <DrawerDescription>
                    Update your income type details
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 min-h-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className='p-4'>
                        <FormLabel>Income type name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g., Salary, Investment, Interest, Reimbursement'
                            {...field}
                            disabled={isUpdating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyTarget"
                    render={({ field }) => (
                      <FormItem className='p-4'>
                        <FormLabel>Monthly target</FormLabel>
                        <FormDescription>
                          Set a monthly income goal for this category (optional).
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
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
                    {isUpdating ? "Updating income type" : "Update income type"}
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
                    {isDeleting ? "Deleting..." : "Delete income type"}
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
            Are you sure you want to delete <span className="font-semibold">{incomeTypeData?.name}</span>? 
            Any transactions using this type will be reassigned to &apos;Uncategorized&apos;. This action cannot be undone.
          </>
        }
        title="Delete income type"
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditIncomeTypeDrawer