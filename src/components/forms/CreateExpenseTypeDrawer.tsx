"use client"

import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface CreateExpenseTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  onBudgetCreated?: () => void;
}

const CreateExpenseTypeDrawer = ({ open, onOpenChange, className, onBudgetCreated }: CreateExpenseTypeDrawerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: '',
      monthlyBudget: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/expense-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/jason',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error("Failed to create budget")
      }

      const newBudget = await response.json();
      if (newBudget) {
        toast.success("Budget added successfully", {
          description: `${newBudget.name} has been added to your budgets.`,
          duration: 5000  
        })
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()} className={`${className}`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Add Budget
              </DrawerTitle>
              <DrawerDescription>
                Create a budget category to track your monthly spending and stay on target.
              </DrawerDescription>
            </DrawerHeader>

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
                <FormItem className='p-4'>
                  <FormLabel>Monthly budget</FormLabel>
                  <FormDescription>
                    Set a monthly spending limit for this category (optional).
                  </FormDescription>
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

            <DrawerFooter>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Adding budget" : "Add budget"}
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  )
}

export default CreateExpenseTypeDrawer