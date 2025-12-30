"use client"

import React, { useEffect, useRef, useState } from 'react'
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
import { Separator } from '../ui/separator'
import DeleteDialog from '../shared/DeleteDialog'
import { ScrollArea } from '../ui/scroll-area'

interface EditAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  accountId: string;
}

const EditAccountDrawer = ({ open, onOpenChange, className, accountId }: EditAccountDrawerProps) => {
  const { updateAccount, isUpdating, deleteAccount, isDeleting } = useAccountsQuery();
  const { data: accountData, isFetching, error } = useAccountQuery(accountId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [accountData]);

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

  const handleDeleteClick = async () => {
    const response = await fetch(`/api/accounts/${accountId}/transaction-count`);
    const { count } = await response.json();

    if (count > 0) {
      toast.error("Cannot delete account with existing transactions", {
        description: `Please delete the ${count} transctions first.`,
        duration: 10000,
      });

      return;
    }

    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteAccount(accountId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Account deleted successfully", {
        description:`${accountData?.name} has been deleted.`,
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete account", {
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
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
              <DrawerHeader className='flex-shrink-0'>
                <DrawerTitle className='text-xl'>Edit account</DrawerTitle>
                <DrawerDescription>
                  Update your account details and information.
                </DrawerDescription>
              </DrawerHeader>

              <div className="relative flex-1 min-h-0">
                <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          key={field.value || 'account-type-select'}
                          disabled={isUpdating}
                        >
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
                            <SelectItem value="PAYROLL">Payroll</SelectItem>
                            <SelectItem value="E_WALLET">E-Wallet</SelectItem>
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

                <Separator className='my-2' />

                <div className='px-4 pb-4'>
                  <Button
                    type='button'
                    variant='outline'
                    className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                    onClick={handleDeleteClick}
                    disabled={isUpdating || isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete account"}
                  </Button>
                </div>
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
        title="Delete Account"
        itemName={accountData?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditAccountDrawer