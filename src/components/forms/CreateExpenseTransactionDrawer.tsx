"use client"

import React from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
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

  const allAccounts = [...accounts, ...cards];

  const form = useForm<z.infer<typeof createExpenseTransactionSchema>>({
    resolver: zodResolver(createExpenseTransactionSchema),
    defaultValues: {
      name: "",
      amount: "",
      accountId: "",
      expenseTypeId: "",
      date: undefined,
      description: "",
      isInstallment: false,
      installmentDuration: null,
      installmentStartDate: null,
    }
  });

  const selectedAccountId = form.watch("accountId");
  const selectedAccount = allAccounts.find(acc => acc.id === selectedAccountId);
  const isCreditCard = selectedAccount?.accountType === "CREDIT_CARD";
  const isInstallment = form.watch("isInstallment")

  const onSubmit = async (values: z.infer<typeof createExpenseTransactionSchema>) => {
    try {
      const newExpenseTransaction = await createExpenseTransaction(values);

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
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()} className={`${className}`}
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

            <ScrollArea className="flex-1 min-h-0 scrollbar-hide">
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
                <FormField
                  control={form.control}
                  name="isInstallment"
                  render={({ field }) => (
                    <FormItem className="p-4 flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isCreating}
                          />
                          <Label>Is this an installment transaction?</Label>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {isCreditCard && isInstallment && (
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
                            {...field}
                            value={field.value ?? ""}
                            placeholder="e.g., 12 months, 24 months"
                            className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
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

              <FormField
                control={form.control}
                name="expenseTypeId"
                render={({ field }) => (
                  <FormItem className="p-4">
                    <FormLabel>Expense type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreating}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select income type" />
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