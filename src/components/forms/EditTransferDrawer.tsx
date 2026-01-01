"use client"

import { z } from "zod"
import React, { useEffect, useRef, useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTransfersQuery, useTransferQuery } from "@/hooks/useTransferTransactionsQuery";
import { useForm } from "react-hook-form";
import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useTransferTypesQuery } from "@/hooks/useTransferTypesQuery";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ArrowRight, ChevronDownIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { format } from "date-fns";
import { TransferTransactionValidation } from "@/lib/validations/transfer-transactions";
import { ScrollArea } from "../ui/scroll-area";
import SkeletonEditTransferDrawerForm from "../shared/SkeletonEditTransferDrawerForm";
import DeleteDialog from "../shared/DeleteDialog";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

interface EditTransferDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  transferId: string;
}

const EditTransferDrawer = ({ open, onOpenChange, className, transferId }: EditTransferDrawerProps) => {
  const { updateTransfer, isUpdating, deleteTransfer, isDeleting } = useTransfersQuery();
  const { transactionData, isFetching, error } = useTransferQuery(transferId);
  const { accounts } = useAccountsQuery();
  const { transferTypes } = useTransferTypesQuery();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const [hasFee, setHasFee] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof TransferTransactionValidation>>({
    resolver: zodResolver(TransferTransactionValidation),
    defaultValues: {
      name: "",
      amount: "",
      fromAccountId: "",
      toAccountId: "",
      transferTypeId: "",
      date: undefined,
      notes: "",
      feeAmount: "",
    }
  });

  useEffect(() => {
    if (transactionData) {
      const hasFeeAmount = transactionData.feeAmount !== null && transactionData.feeAmount !== undefined;

      form.reset({
        name: transactionData.name,
        amount: transactionData.amount.toString(),
        fromAccountId: transactionData.fromAccountId,
        toAccountId: transactionData.toAccountId,
        transferTypeId: transactionData.transferTypeId,
        date: new Date(transactionData.date),
        notes: transactionData.notes || "",
        feeAmount: hasFeeAmount && transactionData.feeAmount !== null ? transactionData.feeAmount.toString() : "",      });

      setHasFee(hasFeeAmount);
    }
  }, [transactionData, form]);

  const selectedFromAccountId = form.watch("fromAccountId");
  const selectedToAccountId = form.watch("toAccountId");

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
  }, [transactionData]);

  const handleFeeCheckboxChange = (checked: boolean) => {
    setHasFee(checked);
    if (!checked) {
      form.setValue("feeAmount", "");
    }
  };

  const onSubmit = async (values: z.infer<typeof TransferTransactionValidation>) => {
    try {
      const payload = {
        id: transferId,
        ...values,
        date: values.date.toISOString().split('T')[0],
      };

      const updatedTransfer = await updateTransfer(payload);

      toast.success("Transfer updated successfully", {
        description: `${updatedTransfer.name} has been updated.`,
        duration: 5000
      });
      form.reset();
      setHasFee(false);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update transfer", {
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
      await deleteTransfer(transferId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Transfer deleted successfully", {
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete transfer", {
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
          className={`${className}`}
        >
          {isFetching ? (
            <SkeletonEditTransferDrawerForm />
          ) : error ? (
            <>
              <DrawerHeader className='text-center'>
                <DrawerTitle className='text-xl'>Unable to load transfer</DrawerTitle>
                <DrawerDescription>
                  {error || 'Something went wrong while loading your transfer details.'}
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
                    Edit Transfer Transaction
                  </DrawerTitle>
                  <DrawerDescription>
                    Update your transfer transaction details.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="relative flex-1 min-h-0">
                  <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="p-4">
                          <FormLabel>Transfer name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='e.g., Emergency fund, Credit card payment, Savings'
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

                    <div className="px-4 pb-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="hasFee" 
                          checked={hasFee}
                          onCheckedChange={handleFeeCheckboxChange}
                          disabled={isUpdating}
                        />
                        <label
                          htmlFor="hasFee"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          This transfer has a fee
                        </label>
                      </div>

                      {hasFee && (
                        <FormField
                          control={form.control}
                          name="feeAmount"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Fee Amount</FormLabel>
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
                      )}
                    </div>

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
                              key={field.value || 'from-account-select'}
                              disabled={isUpdating}
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
                              key={field.value || 'to-account-select'}
                              disabled={isUpdating}
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
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            key={field.value || 'from-account-select'}
                            disabled={isUpdating}
                          >
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
                    {isUpdating ? "Updating transfer" : "Update transfer"}
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
                    {isDeleting ? "Deleting..." : "Delete transfer"}
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
        title="Delete Transfer Transaction"
        itemName={transactionData?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditTransferDrawer