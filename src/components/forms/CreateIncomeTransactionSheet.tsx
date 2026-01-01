"use client"
import { z } from "zod"
import React from 'react'
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useIncomeTransactionsQuery } from "@/hooks/useIncomeTransactionsQuery";
import { useForm } from "react-hook-form";
import { IncomeTransactionValidation } from "@/lib/validations/income-transactions";
import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { format } from "date-fns";
import { formatDateForAPI } from "@/lib/utils";

interface CreateIncomeTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateIncomeTransactionSheet = ({ open, onOpenChange, className }: CreateIncomeTransactionProps) => {
  const { createIncomeTransaction, isCreating } = useIncomeTransactionsQuery();
  const { accounts } = useAccountsQuery();
  const { incomeTypes } = useIncomeTypesQuery();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  

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

  const onSubmit = async (values: z.infer<typeof IncomeTransactionValidation>) => {
    try {
      const payload = {
        ...values,
        date: formatDateForAPI(values.date),
      };

      const newIncomeTransaction = await createIncomeTransaction(payload);

      toast.success("Income transaction created successfully", {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader>
              <SheetTitle className="text-2xl">
                Add Income Transaction
              </SheetTitle>
              <SheetDescription>
                Add a new income transaction to your account.
              </SheetDescription>
            </SheetHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Income transaction name</FormLabel>
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

          <SheetFooter>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? "Adding income" : "Add income"}
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

export default CreateIncomeTransactionSheet