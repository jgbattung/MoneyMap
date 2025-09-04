"use client"

import { z } from "zod"
import React, { useState } from 'react'
import { ExpenseTypeValidation } from "@/lib/validations/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface CreateExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  onBudgetCreated?: () => void;
}

const CreateExpenseTypeSheet = ({ open, onOpenChange, className, onBudgetCreated }: CreateExpenseTypeSheetProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
    }
  });

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/expense-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error("Failed to create budget")
      } 

      const newCard = await response.json();
      if (newCard) {
        toast.success("Budget added successfully" , {
          description: `${newCard.name} has been added to your budgets.`,
          duration: 5000
        });
        form.reset();
        onOpenChange(false);
        onBudgetCreated?.();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to add budget", {
          description: error.message || "Please check your information and try again.",
          duration: 6000
        })
      } else {
        toast.error("Something went wrong", {
          description: "Unable to add budget. Please try again",
          duration: 6000
        })
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader>
              <SheetTitle className='text-2xl'>Add Budget</SheetTitle>
              <SheetDescription>
                Create a budget category to track your monthly spending and stay on target.
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
                {isLoading ? "Adding budget" : "Add budget"}
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
      </SheetContent>
    </Sheet>
  )
}

export default CreateExpenseTypeSheet