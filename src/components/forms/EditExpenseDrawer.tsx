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
import { useExpenseTransactionQuery, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
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
import SkeletonEditExpenseDrawerForm from '../shared/SkeletonEditExpenseDrawerForm';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';
import { formatDateForAPI } from '@/lib/utils';

interface EditExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
}

const EditExpenseDrawer = ({ open, onOpenChange, expenseId }: EditExpenseDrawerProps) => {
  const { updateExpenseTransaction, isUpdating, deleteExpenseTransaction, isDeleting } = useExpenseTransactionsQuery();
  const { expenseTransactionData, isFetching, error } = useExpenseTransactionQuery(expenseId);
  const { accounts } = useAccountsQuery();
  const { cards } = useCardsQuery();
  const { budgets } = useExpenseTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [installmentCalendarOpen, setInstallmentCalendarOpen] = React.useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    if (expenseTransactionData) {
      form.reset({
        name: expenseTransactionData.name,
        amount: expenseTransactionData.amount,
        accountId: expenseTransactionData.accountId,
        expenseTypeId: expenseTransactionData.expenseTypeId,
        expenseSubcategoryId: expenseTransactionData.expenseSubcategoryId || "none",
        description: expenseTransactionData.description || "",
        date: expenseTransactionData.date 
          ? new Date(expenseTransactionData.date) 
          : undefined,
        isInstallment: expenseTransactionData.isInstallment,
        installmentDuration: expenseTransactionData.installmentDuration ?? undefined,
        installmentStartDate: expenseTransactionData.installmentStartDate 
          ? new Date(expenseTransactionData.installmentStartDate)
          : undefined,
      })
    }
  }, [expenseTransactionData, form])

  const selectedAccountId = form.watch("accountId");
  const selectedAccount = allAccounts.find(acc => acc.id === selectedAccountId);
  const isCreditCard = selectedAccount?.accountType === "CREDIT_CARD";
  const isInstallment = form.watch("isInstallment");

  // Watch selected expense type for subcategory dropdown
  const selectedExpenseTypeId = form.watch("expenseTypeId");
  const selectedExpenseType = budgets.find(budget => budget.id === selectedExpenseTypeId);
  const hasSubcategories = selectedExpenseType?.subcategories && selectedExpenseType.subcategories.length > 0;

  // Reset subcategory when expense type changes
  useEffect(() => {
    if (expenseTransactionData && selectedExpenseTypeId !== expenseTransactionData.expenseTypeId) {
      form.setValue("expenseSubcategoryId", "none");
    }
  }, [selectedExpenseTypeId, expenseTransactionData, form]);

  useEffect(() => {
    const checkScroll = () => {
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
        setShowGradient(!isAtBottom);
      }
    };

    checkScroll();

    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    scrollElement?.addEventListener('scroll', checkScroll);

    return () => {
      scrollElement?.removeEventListener('scroll', checkScroll);
    };
  }, [expenseTransactionData]);

  const onSubmit = async (values: z.infer<typeof createExpenseTransactionSchema>) => {
    try {
      // Convert "none" to undefined for optional subcategory
      const payload = {
        id: expenseId,
        ...values,
        expenseSubcategoryId: values.expenseSubcategoryId === "none" ? undefined : values.expenseSubcategoryId,
        date: values.date ? formatDateForAPI(values.date) : undefined,
        installmentStartDate: values.installmentStartDate ? formatDateForAPI(values.installmentStartDate) : null,
      };

      const updatedExpense = await updateExpenseTransaction(payload);

      toast.success("Expense has been updated successfully", {
        description: `${updatedExpense.name} has been updated.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update expense", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  const handleDeleteClick = async () => {
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteExpenseTransaction(expenseId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Expense transaction deleted successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete expense transaction", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
        >
          {isFetching ? (
            <SkeletonEditExpenseDrawerForm />
          ) : error ? (
          <>
            <DrawerHeader className='text-center'>
              <DrawerTitle className='text-xl'>Unable to load expense</DrawerTitle>
              <DrawerDescription>
                {error || 'Something went wrong while loading your expense details.'}
              </DrawerDescription>
            </DrawerHeader>
            
            <DrawerFooter>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try again
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className="w-full hover:text-white"
                >
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85dvh]'>
              <DrawerHeader className='flex-shrink-0'>
                <DrawerTitle className='text-xl'>
                  Edit Expense Transaction
                </DrawerTitle>
                <DrawerDescription>
                  Edit expense transaction.
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
                            disabled={isUpdating}
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
                            disabled={isUpdating}
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          key={field.value || 'account-select'}
                          disabled={isUpdating}
                        >
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
                          disabled={isUpdating}
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
                                    disabled={isUpdating}
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
                                        disabled={isUpdating}
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          key={field.value || 'expense-type-select'}
                          disabled={isUpdating}
                        >
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
                            defaultValue={field.value || "none"}
                            key={field.value || 'subcategory-select'}
                            disabled={isUpdating}
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
                                  disabled={isUpdating}
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
                            disabled={isUpdating}
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
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating expense" : "Update expense"}
                </Button>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className='hover:text-white'
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </DrawerClose>
                
                <Separator className='my-2' />

                <Button
                  type='button'
                  variant='outline'
                  className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                  onClick={handleDeleteClick}
                  disabled={isUpdating || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete expense"}
                </Button>
              </DrawerFooter>

            </form>
          </Form>
        )}
        </DrawerContent>
      </Drawer>
    
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Transaction"
        itemName={expenseTransactionData?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditExpenseDrawer