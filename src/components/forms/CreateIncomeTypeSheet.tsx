"use client"

import { z } from "zod"
import React from 'react'
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { useForm } from "react-hook-form";
import { IncomeTypeValidation } from "@/lib/validations/income";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface CreateIncomeTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateIncomeTypeSheet = ({ open, onOpenChange, className }: CreateIncomeTypeSheetProps) => {
  const { createIncomeType, isCreating } = useIncomeTypesQuery();
  
  const form = useForm<z.infer<typeof IncomeTypeValidation>> ({
    resolver: zodResolver(IncomeTypeValidation),
    defaultValues: {
      name: "",
      monthlyTarget: "",
    }
  });

  const onSubmit = async (values: z.infer<typeof IncomeTypeValidation>) => {
    try {
      const newIncomeType = await createIncomeType(values);

      toast.success("Income type created successfully", {
        description: `${newIncomeType.name} has been added to your income types.`,
        duration: 5000,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create income type", {
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
              <SheetTitle className="text-2xl">
                Add Income Type
              </SheetTitle>
              <SheetDescription>
                Create an income category to organize and track your earnings.
              </SheetDescription>
            </SheetHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Income name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Salary, Investment, Interest, Reimbursement'
                      {...field}
                      disabled={isCreating}
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
                {isCreating ? "Adding income category" : "Add income category"}
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

export default CreateIncomeTypeSheet