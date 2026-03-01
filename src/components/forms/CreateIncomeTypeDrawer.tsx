"use client"

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useIncomeTypesQuery } from '@/hooks/useIncomeTypesQuery';
import { IncomeTypeValidation } from '@/lib/validations/income';

interface CreateIncomeTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateIncomeTypeDrawer = ({ open, onOpenChange, className }: CreateIncomeTypeDrawerProps) => {
  const { createIncomeType, isCreating } = useIncomeTypesQuery();

  const form = useForm<z.infer<typeof IncomeTypeValidation>>({
    resolver: zodResolver(IncomeTypeValidation),
    defaultValues: {
      name: '',
      monthlyTarget: '',
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
    <Drawer repositionInputs={false} open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()} className={`${className}`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85dvh]'>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Add Income Type
              </DrawerTitle>
              <DrawerDescription>
                Create an income category to organize and track your earnings.
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 min-h-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className='p-4'>
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
                {isCreating ? "Adding income category" : "Add income category"}
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

export default CreateIncomeTypeDrawer