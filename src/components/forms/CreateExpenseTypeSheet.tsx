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
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";

interface CreateExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateExpenseTypeSheet = ({ open, onOpenChange, className }: CreateExpenseTypeSheetProps) => {
  const { createBudget, isCreating } = useExpenseTypesQuery();

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
    }
  });

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    try {
      const newBudget = await createBudget(values);

      toast.success("Budget created successfully", {
        description: `${newBudget.name} has been added to your budgets.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create budget", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()}
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
                      disabled={isCreating}
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
                      disabled={isCreating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding budget" : "Add budget"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isCreating}
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