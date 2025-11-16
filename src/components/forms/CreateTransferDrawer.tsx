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
import { useTransfersQuery } from "@/hooks/useTransferTransactionsQuery";
import { useTransferTypesQuery } from "@/hooks/useTransferTypesQuery";
import { TransferTransactionValidation } from "@/lib/validations/transfer-transactions";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ArrowRight, ChevronDownIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Textarea } from "../ui/textarea";
import { format } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

interface CreateTransferDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateTransferDrawer = ({ open, onOpenChange, className }: CreateTransferDrawerProps) => {
  const { createTransfer, isCreating } = useTransfersQuery();
  const { accounts } = useAccountsQuery();
  const { transferTypes } = useTransferTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof TransferTransactionValidation>> ({
    resolver: zodResolver(TransferTransactionValidation),
      defaultValues: {
      name: "",
      amount: "",
      fromAccountId: "",
      toAccountId: "",
      transferTypeId: "",
      date: undefined,
      notes: "",
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

  const selectedFromAccountId = form.watch("fromAccountId");
  const selectedToAccountId = form.watch("toAccountId");

  const onSubmit = async (values: z.infer<typeof TransferTransactionValidation>) => {
    try {
      const newTransfer = await createTransfer(values);

      toast.success(`${newTransfer.name} has been added to your transfer transactions`);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create transfer transaction", {
        description: error instanceof Error ? error.message : "Please try again",
        duration: 6000
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()} 
        className={`${className}`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle className='text-xl'>
                Add Transfer Transaction
              </DrawerTitle>
              <DrawerDescription>
                Transfer money between your accounts.
              </DrawerDescription>
            </DrawerHeader>

            <div className="relative flex-1 min-h-0">
              <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Transfer name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Emergency fund, Credit card payment, Savings'
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

                {/* Side-by-side From and To Accounts */}
                <div className="flex items-center gap-3 p-4">
                  <FormField
                    control={form.control}
                    name="fromAccountId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>From Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value} 
                          disabled={isCreating}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts
                              .filter(account => account.id !== selectedToAccountId)
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-8 flex-shrink-0" />

                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>To Account</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value} 
                          disabled={isCreating}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts
                              .filter(account => account.id !== selectedFromAccountId)
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="transferTypeId"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Transfer type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreating}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select transfer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transferTypes.map((transferType) => (
                            <SelectItem key={transferType.id} value={transferType.id}>
                              {transferType.name}
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
                            selected={field.value}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes..."
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

            <DrawerFooter className="flex-shrink-0">
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding transfer" : "Add transfer"}
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

export default CreateTransferDrawer