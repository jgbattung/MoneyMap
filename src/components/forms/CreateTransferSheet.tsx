"use client"
import { z } from "zod"
import React from 'react'
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTransfersQuery } from "@/hooks/useTransferTransactionsQuery";
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
import { Checkbox } from "../ui/checkbox";

interface CreateTransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateTransferSheet = ({ open, onOpenChange, className }: CreateTransferSheetProps) => {
  const { createTransfer, isCreating } = useTransfersQuery();
  const { accounts } = useAccountsQuery();
  const { transferTypes } = useTransferTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [hasFee, setHasFee] = React.useState(false);  

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
      feeAmount: "",
    }
  });

  const selectedFromAccountId = form.watch("fromAccountId");
  const selectedToAccountId = form.watch("toAccountId");

  const handleFeeCheckboxChange = (checked: boolean) => {
    setHasFee(checked);
    if (!checked) {
      form.setValue("feeAmount", "");
    }
  };

  const onSubmit = async (values: z.infer<typeof TransferTransactionValidation>) => {
    try {
      const payload = {
        ...values,
        date: values.date.toISOString().split('T')[0],
      };
      
      const newTransfer = await createTransfer(payload);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader>
              <SheetTitle className="text-2xl">
                Add Transfer Transaction
              </SheetTitle>
              <SheetDescription>
                Transfer money between your accounts.
              </SheetDescription>
            </SheetHeader>

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

            <div className="px-4 pb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasFee"
                  checked={hasFee}
                  onCheckedChange={handleFeeCheckboxChange}
                  disabled={isCreating}
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
                          disabled={isCreating}
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

          <SheetFooter>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? "Adding transfer" : "Add transfer"}
            </Button>
            <SheetClose asChild>
              <Button
                variant="outline"
                className='hover:text-white'
                disabled={isCreating}
              >
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>

          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

export default CreateTransferSheet