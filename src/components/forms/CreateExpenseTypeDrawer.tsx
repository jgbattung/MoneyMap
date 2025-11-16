"use client"

import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';

interface CreateExpenseTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  onBudgetCreated?: () => void;
}

const CreateExpenseTypeDrawer = ({ open, onOpenChange, className }: CreateExpenseTypeDrawerProps) => {
  const { createBudget, isCreating } = useExpenseTypesQuery();

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: '',
      monthlyBudget: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    try {
      const newBudget = await createBudget(values);

      toast.success("Budget created successfully", {
        description: `${newBudget.name} has been added to your budget.`,
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()} className={`${className}`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Add Budget
              </DrawerTitle>
              <DrawerDescription>
                Create a budget category to track your monthly spending and stay on target.
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
                  <FormItem className='p-4'>
                    <FormLabel>Monthly budget</FormLabel>
                    <FormDescription>
                      Set a monthly spending limit for this category (optional).
                    </FormDescription>
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
            </div>

            <DrawerFooter className='flex-shrink-0'>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding budget" : "Add budget"}
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isCreating}
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