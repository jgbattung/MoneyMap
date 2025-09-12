"use client"

import React, { useState } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { z } from "zod"
import { CardValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { getOrdinalSuffix } from '@/lib/utils';
import { useCardsQuery } from '@/hooks/useCardsQuery';

interface CreateCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateCardDrawer = ({ open, onOpenChange, className }: CreateCardDrawerProps) => {
  const { createCard, isCreating } = useCardsQuery(); 

  const form = useForm<z.infer<typeof CardValidation>>({
    resolver: zodResolver(CardValidation),
    defaultValues: {
      name: '',
      initialBalance: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof CardValidation>) => {
    try {
      const newCard = await createCard(values);

      toast.success("Card created successfully", {
        description: `${newCard.name} has been added to your cards.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create card", {
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Add Credit Card
              </DrawerTitle>
              <DrawerDescription>
                Add a new credit card to track your balance, payments, and due dates.
              </DrawerDescription>
            </DrawerHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className='p-4'>
                  <FormLabel>Card name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., BPI Blue Mastercard, Metrobank Rewards Plus'
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <FormItem className='p-4'>
                  <FormLabel>Outstanding balance</FormLabel>
                  <FormDescription>
                    Current amount owed on this credit card 
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                      disabled={isCreating}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="statementDate"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Statement Date</FormLabel>
                  <FormDescription>
                    Day of the month when your statement is generated
                  </FormDescription>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      disabled={isCreating}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}{getOrdinalSuffix(i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Due Date</FormLabel>
                  <FormDescription>
                    Day of the month when payment is due
                  </FormDescription>
                  <FormControl>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      disabled={isCreating}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}{getOrdinalSuffix(i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <DrawerFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding credit card" : "Add credit card"}
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

export default CreateCardDrawer