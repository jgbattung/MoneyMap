"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { createExpenseTransactionSchema } from '@/lib/validations/expense-transactions';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ChevronDownIcon } from "lucide-react";
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface CreateExpenseTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateExpenseTransactionDrawer = ({ open, onOpenChange,  className}: CreateExpenseTransactionProps) => {
  const { createExpenseTransaction, isCreating } = useExpenseTransactionsQuery();
  const { accounts } = useAccountsQuery();
  const { cards } = useCardsQuery();
  const { budgets } = useExpenseTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [installmentCalendarOpen, setInstallmentCalendarOpen] = React.useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allAccounts = [...accounts, ...cards];

  const form = useForm<z.infer<typeof createExpenseTransactionSchema>>({
    resolver: zodResolver(createExpenseTransactionSchema),
    defaultValues: {
      name: "",
      amount: "",
      accountId: "",
      expenseTypeId: "",
      expenseSubcategoryId: "none",
      date: undefined,
      description: "",
      isInstallment: false,
      installmentDuration: null,
      installmentStartDate: null,
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

  const selectedAccountId = form.watch("accountId");
  const selectedAccount = allAccounts.find(acc => acc.id === selectedAccountId);
  const isCreditCard = selectedAccount?.accountType === "CREDIT_CARD";
  const isInstallment = form.watch("isInstallment");

  // Watch selected expense type
  const selectedExpenseTypeId = form.watch("expenseTypeId");
  const selectedExpenseType = budgets.find(budget => budget.id === selectedExpenseTypeId);
  const hasSubcategories = selectedExpenseType?.subcategories && selectedExpenseType.subcategories.length > 0;

  // Reset subcategory when expense type changes
  useEffect(() => {
    form.setValue("expenseSubcategoryId", "none");
  }, [selectedExpenseTypeId, form]);

  const onSubmit = async (values: z.infer<typeof createExpenseTransactionSchema>) => {
    try {
      // Convert "none" to undefined for optional subcategory
      const payload = {
        ...values,
        expenseSubcategoryId: values.expenseSubcategoryId === "none" ? undefined : values.expenseSubcategoryId,
        date: values.date ? values.date.toISOString().split('T')[0] : undefined,
        installmentStartDate: values.installmentStartDate ? values.installmentStartDate.toISOString().split('T')[0] : null,
      };

      const newExpenseTransaction = await createExpenseTransaction(payload);

      toast.success("Expense transaction created successfully", {
        description: `${newExpenseTransaction.name} has been added to your expense transactions.`,
        duration: 5000,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create expense transaction", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
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
            <DrawerHeader className='flex-shrink-0'>
              <DrawerTitle className='text-xl'>
                Add Expense Transaction
              </DrawerTitle>
              <DrawerDescription>
                Add a new expense transaction.
              </DrawerDescription>
            </DrawerHeader>

            <div className="relative flex-1 min-h-0">
              <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Expense name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Rent, groceries, Grab ride, Netflix'
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
                    <FormItem className="p-4">
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
                          {allAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {isCreditCard && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <Switch
                        id="installment-mode"
                        checked={isInstallment}
                        onCheckedChange={(checked) => form.setValue("isInstallment", checked)}
                        disabled={isCreating}
                      />
                      <Label htmlFor="installment-mode" className="cursor-pointer">
                        Installment
                      </Label>
                    </div>

                    {isInstallment && (
                      <>
                        <FormField
                          control={form.control}
                          name="installmentDuration"
                          render={({ field }) => (
                            <FormItem className="p-4">
                              <FormLabel>Installment duration (months)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                                  {...field}
                                  value={field.value ?? ''}
                                  disabled={isCreating}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="installmentStartDate"
                          render={({ field }) => (
                            <FormItem className="p-4">
                              <FormLabel>Installment start date</FormLabel>
                              <Popover open={installmentCalendarOpen} onOpenChange={setInstallmentCalendarOpen} modal>
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
                                      setInstallmentCalendarOpen(false)
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="expenseTypeId"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Expense type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreating}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select expense type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {budgets.map((expense) => (
                            <SelectItem key={expense.id} value={expense.id}>
                              {expense.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Subcategory Dropdown - Only show if selected expense type has subcategories */}
                {hasSubcategories && (
                  <FormField
                    control={form.control}
                    name="expenseSubcategoryId"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Subcategory (Optional)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || "none"} 
                          disabled={isCreating}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select subcategory (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {selectedExpenseType?.subcategories?.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {!isInstallment && (
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
                )}

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

            <DrawerFooter className='flex-shrink-0'>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding expense" : "Add expense"}
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

export default CreateExpenseTransactionDrawer;