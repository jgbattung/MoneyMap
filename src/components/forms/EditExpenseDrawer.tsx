import { useExpenseTransactionQuery, useExpenseTransactionsQuery } from '@/hooks/useExpenseTransactionsQuery';
import { createExpenseTransactionSchema } from '@/lib/validations/expense-transactions';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { ChevronDownIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';
import SkeletonEditExpenseDrawerForm from '../shared/SkeletonEditExpenseDrawerForm';

interface EditExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  expenseId: string;
}

const EditExpenseDrawer = ({ open, onOpenChange, className, expenseId }: EditExpenseDrawerProps) => {
  const { updateExpenseTransaction, isUpdating, deleteExpenseTransaction, isDeleting } = useExpenseTransactionsQuery();
  const { expenseTransactionData, isFetching, error } = useExpenseTransactionQuery(expenseId);
  const { accounts } = useAccountsQuery();
  const { cards } = useCardsQuery();
  const { budgets } = useExpenseTypesQuery();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  useEffect(() => {
    if (expenseTransactionData) {
      form.reset({
        name: expenseTransactionData.name,
        amount: expenseTransactionData.amount,
        accountId: expenseTransactionData.accountId,
        expenseTypeId: expenseTransactionData.expenseTypeId,
        date: new Date(expenseTransactionData.date),
        description: expenseTransactionData.description ?? undefined,
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
  const isInstallment = form.watch("isInstallment")

  const onSubmit = async (values: z.infer<typeof createExpenseTransactionSchema>) => {
    try {
      const updatedExpense = await updateExpenseTransaction({ id: expenseId, ...values });

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
    } catch (error: any) {
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
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()} className={`${className}`}
        >
          {isFetching ? (
            <SkeletonEditExpenseDrawerForm />
          ) : error ? (
          <>
            <DrawerHeader className='text-center'>
              <DrawerTitle className='text-xl'>Unable to load expense</DrawerTitle>
              <DrawerDescription>
                {error || 'Something went wrong while loading your account details.'}
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
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
              <DrawerHeader className='flex-shrink-0'>
                <DrawerTitle className='text-xl'>
                  Edit Expense Transaction
                </DrawerTitle>
                <DrawerDescription>
                  Edit expense transaction.
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating}>
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
                              disabled={isUpdating}
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

                <FormField
                  control={form.control}
                  name="expenseTypeId"
                  render={({ field }) => (
                    <FormItem className="p-4">
                      <FormLabel>Expense type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating}>
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
              </DrawerFooter>

              <Separator className='mt-2 mb-6' />

              <div className='px-4 pb-4'>
                <Button
                  type='button'
                  variant='outline'
                  className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                  onClick={handleDeleteClick}
                  disabled={isUpdating || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete transfer"}
                </Button>
              </div>

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