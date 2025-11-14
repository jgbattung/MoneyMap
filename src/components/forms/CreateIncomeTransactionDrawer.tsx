"use client"
import { z } from "zod"
import React, { useEffect, useRef, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { useIncomeTransactionsQuery } from "@/hooks/useIncomeTransactionsQuery";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { IncomeTransactionValidation } from "@/lib/validations/income-transactions";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Textarea } from "../ui/textarea";
import { format } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

interface CreateIncomeTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateIncomeTransactionDrawer = ({ open, onOpenChange, className }: CreateIncomeTransactionProps) => {
  const { createIncomeTransaction, isCreating } = useIncomeTransactionsQuery();
  const { accounts } = useAccountsQuery();
  const { incomeTypes } = useIncomeTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof IncomeTransactionValidation>> ({
    resolver: zodResolver(IncomeTransactionValidation),
      defaultValues: {
      name: "",
      amount: "",
      accountId: "",
      incomeTypeId: "",
      date: undefined,
      description: "",
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

  const onSubmit = async (values: z.infer<typeof IncomeTransactionValidation>) => {
    try {
      const newIncomeTransaction = await createIncomeTransaction(values);

      toast.success("Income type created successfully", {
        description: `${newIncomeTransaction.name} has been added to your income transactions.`,
        duration: 5000,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create income transaction", {
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
                Add Income Transaction
              </DrawerTitle>
              <DrawerDescription>
                Add a new income transaction to your account.
              </DrawerDescription>
            </DrawerHeader>

            <div className="relative flex-1 min-h-0">
              <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Income name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Monthly salary, Freelance payment, Stock dividend'
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Amount</FormLabel>
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

                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreating}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incomeTypeId"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Income type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreating}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select income type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incomeTypes.map((incomeType) => (
                            <SelectItem key={incomeType.id} value={incomeType.id}>
                              {incomeType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Date</FormLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal hover:text-white"
                              disabled={isCreating}
                            >
                              {field.value ? (
                                format(field.value, "MMMM, d, yyyy")
                              ) : (
                                <span className="text-muted-foreground">Select date</span>
                              )}
                              <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            captionLayout="dropdown"
                            onDayClick={(date) => {
                              field.onChange(date);
                              setCalendarOpen(false)
                            }}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </ScrollArea>

              {showGradient && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
              )}
            </div>

            <DrawerFooter>
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

export default CreateIncomeTransactionDrawer