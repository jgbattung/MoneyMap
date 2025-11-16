"use client"

import React, { useEffect, useRef, useState } from 'react'
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
import { ScrollArea } from '../ui/scroll-area';

interface CreateCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateCardDrawer = ({ open, onOpenChange, className }: CreateCardDrawerProps) => {
  const { createCard, isCreating } = useCardsQuery();
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof CardValidation>>({
    resolver: zodResolver(CardValidation),
    defaultValues: {
      name: '',
      initialBalance: '',
    }
  });

  useEffect(() => {
    const checkScroll = () => {
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isScrollable = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
        
        setShowGradient(isScrollable && !isAtBottom);
      }
    };

    let scrollElement: Element | null = null;

    const timeout = setTimeout(() => {      
      scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') ?? null;
      
      if (scrollElement) {
        scrollElement.addEventListener('scroll', checkScroll);
        checkScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      scrollElement?.removeEventListener('scroll', checkScroll);
    };
  }, [open]);

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
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
            <DrawerHeader className='flex-shrink-0'>
              <DrawerTitle className='text-xl'>
                Add Credit Card
              </DrawerTitle>
              <DrawerDescription>
                Add a new credit card to track your balance, payments, and due dates.
              </DrawerDescription>
            </DrawerHeader>

            <div className="relative flex-1 min-h-0">
              <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
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
              </ScrollArea>
              
              {showGradient && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
              )}
            </div>

            <DrawerFooter className='flex-shrink-0'>
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