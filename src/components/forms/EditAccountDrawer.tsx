"use client"

import React, { useEffect } from 'react'
import { Button } from '../ui/button'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AccountValidation } from '@/lib/validations/account'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter } from '../ui/drawer'
import SkeletonEditAccountDrawerForm from '../shared/SkeletonEditAccountDrawerForm'
import { useAccountQuery, useAccountsQuery } from '@/hooks/useAccountsQuery'

interface EditAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  accountId: string;
}

const EditAccountDrawer = ({ open, onOpenChange, className, accountId }: EditAccountDrawerProps) => {
  const { updateAccount, isUpdating } = useAccountsQuery();
  const { data: accountData, isFetching, error } = useAccountQuery(accountId);

  const form = useForm<z.infer<typeof AccountValidation>>({
      resolver: zodResolver(AccountValidation),
      defaultValues: {
        name: '',
        initialBalance: '',
        addToNetWorth: true,
      }
    });

  useEffect(() => {
    if (accountData) {
      form.reset({
        name: accountData.name,
        accountType: accountData.accountType,
        initialBalance: accountData.initialBalance.toString(),
        addToNetWorth: accountData.addToNetWorth,
      });
    }
  }, [accountData, form]);

  const onSubmit = async (values: z.infer<typeof AccountValidation>) => {
    try {
      const updatedAccount = await updateAccount({ id: accountId, ...values })

      toast.success("Account updated successfully", {
        description: `${updatedAccount.name} has been updated.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update acount", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
        className={`${className}`}
      >
        {isFetching ? (
          <SkeletonEditAccountDrawerForm />
        ) : error ? (
          <>
            <DrawerHeader className='text-center'>
              <DrawerTitle className='text-xl'>Unable to load account</DrawerTitle>
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>Edit account</DrawerTitle>
              <DrawerDescription>
                Update your account details and information.
              </DrawerDescription>
            </DrawerHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className='p-4'>
                  <FormLabel>Account name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., BPI, GCash, Wallet'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Account type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUpdating}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CHECKING">Checking</SelectItem>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                      <SelectItem value="INVESTMENT">Investment</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CRYPTO">Crypto</SelectItem>
                      <SelectItem value="RETIREMENT">Retirement</SelectItem>
                      <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <FormItem className='p-4'>
                  <FormLabel>Initial balance</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='0'
                      className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                      disabled={isUpdating}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 flex flex-col gap-2">
              <FormLabel>Current balance</FormLabel>
              <Input
                value={`${parseFloat(accountData?.currentBalance || "0").toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`}
                disabled={true}
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <FormField
              control={form.control}
              name="addToNetWorth"
              render={({ field }) => (
                <FormItem className="p-4 flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isUpdating}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Include in net worth calculation</FormLabel>
                    <FormDescription>
                      This account will be included when calculating your total net worth
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DrawerFooter>
              <Button
                type="submit"
                disabled={isUpdating}
              >
                {isUpdating ? "Updating account" : "Update account"}
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
          </form>
        </Form>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export default EditAccountDrawer