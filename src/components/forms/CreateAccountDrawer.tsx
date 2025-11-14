"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { z } from "zod"
import { AccountValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { ScrollArea } from '../ui/scroll-area';

interface CreateAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateAccountDrawer = ({ open, onOpenChange, className }: CreateAccountDrawerProps) => {
  const { createAccount, isCreating } = useAccountsQuery();
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
    const checkScroll = () => {
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      
      console.log('🔍 [CreateCardDrawer] checkScroll called');
      console.log('  - scrollElement exists:', !!scrollElement);
      
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isScrollable = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
        
        setShowGradient(isScrollable && !isAtBottom);
      }
    };

    let scrollElement: Element | null = null;

    const timeout = setTimeout(() => {      
      scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') ?? null;
      
      if (scrollElement) {
        scrollElement.addEventListener('scroll', checkScroll);
        console.log('✅ [CreateCardDrawer] Scroll listener added');
        checkScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      scrollElement?.removeEventListener('scroll', checkScroll);
    };
  }, [open]);

  const onSubmit = async (values: z.infer<typeof AccountValidation>) => {
    try {
      const newAccount = await createAccount(values);

      toast.success("Account created successfully", {
        description: `${newAccount.name} has been added to your accounts.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create account", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()} className={`${className}`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85vh]'>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Create account
              </DrawerTitle>
              <DrawerDescription>
                Add a new account to track your balance and transactions.
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
                        disabled={isCreating}
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
                      disabled={isCreating}
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
                        disabled={isCreating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addToNetWorth"
                render={({ field }) => (
                  <FormItem className="p-4 flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isCreating}
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

            <DrawerFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Creating account" : "Create account"}
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  )
}

export default CreateAccountDrawer