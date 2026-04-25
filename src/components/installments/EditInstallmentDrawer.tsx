"use client"

import React, { useEffect, useState } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CurrencyInput } from '../ui/currency-input';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useInstallmentQuery, useInstallmentsQuery } from '@/hooks/useInstallmentsQuery';
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery';
import { updateInstallmentSchema } from '@/lib/validations/installments';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { ChevronDownIcon } from "lucide-react";
import SkeletonEditExpenseDrawerForm from '../shared/SkeletonEditExpenseDrawerForm';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';
import { formatDateForAPI } from '@/lib/utils';

interface EditInstallmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installmentId: string;
}

const EditInstallmentDrawer = ({ open, onOpenChange, installmentId }: EditInstallmentDrawerProps) => {
  const { updateInstallment, deleteInstallment, isUpdating, isDeleting } = useInstallmentsQuery();
  const { installmentData, isFetching, error } = useInstallmentQuery(installmentId, { enabled: open });
  const { budgets } = useExpenseTypesQuery();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof updateInstallmentSchema>>({
    resolver: zodResolver(updateInstallmentSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      amount: "",
      installmentStartDate: undefined,
      expenseTypeId: "",
      expenseSubcategoryId: "none",
    }
  });

  useEffect(() => {
    if (installmentData) {
      form.reset({
        name: installmentData.name,
        amount: installmentData.amount,
        installmentStartDate: installmentData.installmentStartDate
          ? new Date(installmentData.installmentStartDate)
          : undefined,
        expenseTypeId: installmentData.expenseTypeId,
        expenseSubcategoryId: installmentData.expenseSubcategoryId || "none",
      });
    }
  }, [installmentData, form]);

  const watchedAmount = form.watch("amount");
  const duration = installmentData?.installmentDuration ?? 1;
  const monthlyAmount = watchedAmount && !isNaN(Number(watchedAmount)) && Number(watchedAmount) > 0
    ? (Number(watchedAmount) / duration).toFixed(2)
    : null;

  const selectedExpenseTypeId = form.watch("expenseTypeId");
  const selectedExpenseType = budgets.find((b) => b.id === selectedExpenseTypeId);
  const hasSubcategories = selectedExpenseType?.subcategories && selectedExpenseType.subcategories.length > 0;

  useEffect(() => {
    if (installmentData && selectedExpenseTypeId !== installmentData.expenseTypeId) {
      form.setValue("expenseSubcategoryId", "none");
    }
  }, [selectedExpenseTypeId, installmentData, form]);

  const paidCount = (installmentData?.installmentDuration ?? 0) - (installmentData?.remainingInstallments ?? 0);

  const onSubmit = async (values: z.infer<typeof updateInstallmentSchema>) => {
    try {
      const payload = {
        id: installmentId,
        name: values.name,
        amount: values.amount,
        installmentStartDate: formatDateForAPI(values.installmentStartDate),
        expenseTypeId: values.expenseTypeId,
        expenseSubcategoryId: values.expenseSubcategoryId === "none" ? null : values.expenseSubcategoryId,
      };

      const updated = await updateInstallment(payload);

      toast.success("Installment updated successfully", {
        description: `${updated.name} has been updated.`,
        duration: 5000,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update installment", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000,
      });
    }
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    onOpenChange(false);
    toast.success("Installment deleted successfully", { duration: 5000 });
    deleteInstallment(installmentId);
  };

  return (
    <>
      <Drawer repositionInputs={false} open={open} onOpenChange={onOpenChange}>
        <DrawerContent onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}>
          {isFetching ? (
            <SkeletonEditExpenseDrawerForm />
          ) : error ? (
            <>
              <DrawerHeader className="text-center">
                <DrawerTitle className="text-xl">Unable to load installment</DrawerTitle>
                <DrawerDescription>
                  {error || 'Something went wrong while loading your installment details.'}
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button onClick={() => window.location.reload()} className="w-full">
                  Try again
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full hover:text-white">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full max-h-[85dvh]">
                <DrawerHeader className="flex-shrink-0">
                  <DrawerTitle className="text-xl">Edit Installment</DrawerTitle>
                  <DrawerDescription>Edit installment details.</DrawerDescription>
                </DrawerHeader>

                <ScrollArea className="flex-1 min-h-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., iPhone 16 installment" {...field} disabled={isUpdating} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Total amount</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder="0"
                            value={field.value}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            disabled={isUpdating}
                          />
                        </FormControl>
                        {monthlyAmount && (
                          <FormDescription>
                            Monthly: ₱{Number(monthlyAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4">
                    <FormLabel className="text-sm font-medium">Account</FormLabel>
                    <p className="mt-1.5 flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      {installmentData?.account.name}
                    </p>
                  </div>

                  <div className="p-4">
                    <FormLabel className="text-sm font-medium">Duration</FormLabel>
                    <p className="mt-1.5 flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      {installmentData?.installmentDuration} months
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="installmentStartDate"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Installment start date</FormLabel>
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
                                setCalendarOpen(false);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            {budgets.map((budget) => (
                              <SelectItem key={budget.id} value={budget.id}>
                                {budget.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              {selectedExpenseType?.subcategories?.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </ScrollArea>

                <DrawerFooter className="flex-shrink-0">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating installment..." : "Update installment"}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="hover:text-white" disabled={isUpdating}>
                      Cancel
                    </Button>
                  </DrawerClose>

                  <Separator className="my-2" />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isUpdating || isDeleting}
                  >
                    Delete installment
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
        title="Delete installment"
        description={`This will permanently delete this installment and all ${paidCount} payment records. This cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default EditInstallmentDrawer;
