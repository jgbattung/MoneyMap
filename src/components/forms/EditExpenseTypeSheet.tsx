"use client"

import { z } from "zod"
import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import SkeletonEditBudgetForm from "../shared/SkeletonEditBudgetForm";
import { useExpenseTypeQuery, useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";

interface EditExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  budgetId: string;
}

const EditExpenseTypeSheet = ({ open, onOpenChange, className, budgetId }: EditExpenseTypeSheetProps) => {
  const { updateBudget, isUpdating } = useExpenseTypesQuery();
  const { budgetData, isFetching, error } = useExpenseTypeQuery(budgetId);

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        {isFetching ? (
          <SkeletonEditBudgetForm />
        ) : error ? (
          <>
            <SheetHeader className='text-center'>
              <SheetTitle className='text-2xl'>Unable to load bugdet</SheetTitle>
              <SheetDescription>
                {error || 'Something went wrong while loading your account details.'}
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
                <SheetTitle className="text-2xl">Edit budget</SheetTitle>
                <SheetDescription>
                  Update your budget details
                </SheetDescription>
              </SheetHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Budget Name</FormLabel>
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
                <FormItem className="p-4">
                  <FormLabel>Monthly budget</FormLabel>
                  <FormDescription>
                    Set a monthly spending limit for this category (optional).
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
                {isUpdating ? "Updating budget" : "Update budget"}
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
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default EditExpenseTypeSheet