"use client"

import { z } from "zod"
import { IncomeTypeValidation } from '@/lib/validations/income';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useIncomeTypeQuery, useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import SkeletonEditIncomeTypeSheetForm from "../shared/SkeletonEditIncomeTypeSheetForm";
import DeleteDialog from "../shared/DeleteDialog";
import { Separator } from "../ui/separator";

interface EditIncomeTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  incomeTypeId: string;
}

const EditIncomeTypeSheet = ({ open, onOpenChange, className, incomeTypeId }: EditIncomeTypeSheetProps) => {
  const { updateIncomeType, isUpdating, deleteIncomeType, isDeleting } = useIncomeTypesQuery();
  const { incomeTypeData, isFetching, error } = useIncomeTypeQuery(incomeTypeId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof IncomeTypeValidation>>({
    resolver: zodResolver(IncomeTypeValidation),
    defaultValues: {
      name: "",
      monthlyTarget: "",
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
    } catch (error: any) {
      toast.error("Failed to delete income type", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
          className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
        >
          {isFetching ? (
            <SkeletonEditIncomeTypeSheetForm />
          ) : error ? (
            <>
              <SheetHeader className='text-center'>
                <SheetTitle className='text-2xl'>Unable to load income categories</SheetTitle>
                <SheetDescription>
                  {error || 'Something went wrong while loading your income category details.'}
                </SheetDescription>
              </SheetHeader>
              
              <div className='flex flex-col gap-3 p-6'>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  
                  onClick={() => onOpenChange(false)}
                  className='hover:text-white'
                >
                  Close
                </Button>
              </div>
            </>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <SheetHeader>
                  <SheetTitle className="text-2xl">Edit income type</SheetTitle>
                  <SheetDescription>
                    Update your income type details
                  </SheetDescription>
                </SheetHeader>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="p-4">
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
                    <FormItem className="p-4">
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

                <SheetFooter>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating income type" : "Update income type"}
                  </Button>
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      className='hover:text-white'
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                </SheetFooter>

              <Separator className='mt-2 mb-6' />

              <div className='px-4 pb-4'>
                <Button
                  type='button'
                  variant='outline'
                  className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                  onClick={handleDeleteClick}
                  disabled={isUpdating || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete income type"}
                </Button>
              </div>

              </form>
            </Form>
          )}
        </SheetContent>
      </Sheet>

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

export default EditIncomeTypeSheet