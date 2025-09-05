"use client"

import { z } from "zod"
import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface CreateExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  budgetId: string;
  onBudgetUpdated?: () => void;
}

const EditExpenseTypeSheet = ({ open, onOpenChange, className, budgetId, onBudgetUpdated }: CreateExpenseTypeSheetProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
    }
  });

  useEffect(() => {
    if (open && budgetId) {
      const fetchBudgetData = async () => {
        setIsFetching(true);
        try {
          const response = await fetch(`/api/expense-types/${budgetId}`)
          if (!response.ok) {
            throw new Error('Failed to fetch budget');
          }

          const budget = await response.json();

          form.reset({
            name: budget.name,
            monthlyBudget: budget.monthlyBudget,
          });
        } catch (error) {
          if (error instanceof Error) {
            toast.error("Failed to fetch budget information", {
              description: error.message || "Please check your information and try again",
              duration: 6000
            })
          } else {
            toast.error("Something went wrong", {
              description: "Unable to fetch budget information. Please try again.",
              duration: 6000
            })
          }
        } finally {
          setIsFetching(false);
        }
      }

      fetchBudgetData();
    }
  }, [open, budgetId, form]);

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/expense-types/${budgetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        toast.error('Failed to update budget', {
          duration: 6000
        })
      }

      const updatedBudget = await response.json();
      if (updatedBudget) {
        toast.success("Budget updated successfully", {
          description: `${updatedBudget.name} has been updated.`,
          duration: 5000
        });
        form.reset();
        onOpenChange(false);
        onBudgetUpdated?.();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Failed to update budget', {
          description: error.message || "Please check your information and try again.",
          duration: 6000
        })
      } else {
        toast.error("Something went wrong", {
          description: "Unable to update budget. Please try again.",
          duration: 6000
        })
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        {isFetching ? (
          <div>HAHA</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <SheetHeader>
                <SheetTitle className="text-2xl">Edit Budget</SheetTitle>
                <SheetDescription>
                  Update your budget details.
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Updating budget" : "Update budget"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isLoading}
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