"use client"

import React, { useEffect, useState } from 'react'
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
import SkeletonEditAccountSheetForm from '../shared/SkeletonEditAccountSheetForm'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter } from '../ui/drawer'

interface EditAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  accountId: string;
  onAccountUpdated ?: () => void;
}

interface AccountData {
  id: string;
  name: string;
  accountType: string;
  currentBalance: string;
  initialBalance: string;
  addToNetWorth: boolean;
};

const EditAccountDrawer = ({ open, onOpenChange, className, accountId, onAccountUpdated }: EditAccountDrawerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [accountData, setAccountData] = useState<AccountData | null>(null);

  const form = useForm<z.infer<typeof AccountValidation>>({
      resolver: zodResolver(AccountValidation),
      defaultValues: {
        name: '',
        initialBalance: '',
        addToNetWorth: true,
      }
    });

  useEffect(() => {
    if (open && accountId) {
      const fetchAccountData = async () => {
        setIsFetching(true);
        try {
          const response = await fetch(`/api/accounts/${accountId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch account');
          }

          const account = await response.json();
          
          setAccountData(account);

          form.reset({
            name: account.name,
            accountType: account.accountType,
            initialBalance: account.initialBalance.toString(),
            addToNetWorth: account.addToNetWorth,
          });
        } catch (error) {
          if (error instanceof Error) {
            toast.error("Failed to update account", {
              description: error.message || "Please check your information and try again.",
              duration: 6000
            })
          } else {
            toast.error("Something went wrong", {
              description: "Unable to update account. Please try again.",
              duration: 6000
            })
          }
        } finally {
          setIsFetching(false);
        }
      }

      fetchAccountData();
    }
  }, [open, accountId, form]);

  const onSubmit = async (values: z.infer<typeof AccountValidation>) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error('Failed to update account')
      }

      const updatedAccount = await response.json();
      if (updatedAccount) {
        toast.success("Account updated successfully", {
          description: `${updatedAccount.name} has been updated.`,
          duration: 5000
        });
        form.reset();
        onOpenChange(false);
        onAccountUpdated?.();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to update account", {
          description: error.message || "Please check your information and try again.",
          duration: 6000
        })
      } else {
        toast.error("Something went wrong", {
          description: "Unable to update account. Please try again.",
          duration: 6000
        })
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()}
        className={`${className}`}
      >
        {isFetching ? (
          <SkeletonEditAccountSheetForm />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                disabled={isLoading}
              >
                {isLoading ? "Updating account" : "Update account"}
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isLoading}
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