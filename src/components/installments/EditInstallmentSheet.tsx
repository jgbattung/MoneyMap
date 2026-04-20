"use client"

import React, { useEffect, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import SkeletonEditAccountSheetForm from '../shared/SkeletonEditAccountSheetForm'
import { Separator } from '../ui/separator'
import DeleteDialog from '../shared/DeleteDialog'
import { useInstallmentQuery, useInstallmentsQuery } from '@/hooks/useInstallmentsQuery'
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery'
import { updateInstallmentSchema } from '@/lib/validations/installments'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { format } from 'date-fns'
import { ChevronDownIcon } from 'lucide-react'
import { formatDateForAPI } from '@/lib/utils'

interface EditInstallmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  installmentId: string;
}

const EditInstallmentSheet = ({ open, onOpenChange, className, installmentId }: EditInstallmentSheetProps) => {
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
  const monthlyDisplay = (parseFloat(watchedAmount || '0') / duration).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
      await updateInstallment({
        id: installmentId,
        name: values.name,
        amount: values.amount,
        installmentStartDate: formatDateForAPI(values.installmentStartDate),
        expenseTypeId: values.expenseTypeId,
        expenseSubcategoryId: values.expenseSubcategoryId === 'none' ? null : values.expenseSubcategoryId,
      });
      toast.success("Installment updated successfully", { duration: 5000 });
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
    toast.success("Installment deleted successfully", { duration: 5000 });
    deleteInstallment(installmentId);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
          className={`${className ?? ''} w-[600px] sm:max-w-[600px] py-3 px-2`}
        >
          {isFetching ? (
            <SkeletonEditAccountSheetForm />
          ) : error ? (
            <>
              <SheetHeader className="text-center">
                <SheetTitle className="text-2xl">Unable to load installment</SheetTitle>
                <SheetDescription>
                  {error || 'Something went wrong while loading your installment details.'}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-6">
                <Button onClick={() => window.location.reload()} className="w-full">
                  Try again
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="hover:text-white">
                  Close
                </Button>
              </div>
            </>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <SheetHeader>
                  <SheetTitle className="text-2xl">Edit installment</SheetTitle>
                  <SheetDescription>Update your installment details.</SheetDescription>
                </SheetHeader>

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
                        <Input
                          type="number"
                          placeholder="0"
                          className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isUpdating}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Monthly: ₱{monthlyDisplay}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 flex flex-col gap-2">
                  <FormLabel>Account</FormLabel>
                  <Input
                    value={installmentData?.account?.name ?? ''}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <FormLabel>Duration</FormLabel>
                  <Input
                    value={`${installmentData?.installmentDuration ?? 0} months`}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
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

                <SheetFooter>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating installment..." : "Update installment"}
                  </Button>
                  <SheetClose asChild>
                    <Button variant="outline" className="hover:text-white" disabled={isUpdating}>
                      Cancel
                    </Button>
                  </SheetClose>
                </SheetFooter>

                <Separator className="mt-2 mb-6" />

                <div className="px-4 pb-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isUpdating || isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete installment"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </SheetContent>
      </Sheet>

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

export default EditInstallmentSheet;
