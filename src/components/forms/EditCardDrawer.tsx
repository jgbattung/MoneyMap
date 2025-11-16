"use client"

import { CardValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getOrdinalSuffix } from '@/lib/utils';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import SkeletonEditCardDrawerForm from '../shared/SkeletonEditCardDrawerForm';
import { useCardQuery, useCardsQuery } from '@/hooks/useCardsQuery';
import { ScrollArea } from '../ui/scroll-area';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';


interface EditCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  cardId: string;
}

const EditCardDrawer = ({ open, onOpenChange, className, cardId }: EditCardDrawerProps) => {
  const { updateCard, isUpdating, deleteCard, isDeleting } = useCardsQuery();
  const { cardData, isFetching, error } = useCardQuery(cardId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof CardValidation>>({
    resolver: zodResolver(CardValidation),
    defaultValues: {
      name: '',
      initialBalance: '',
      statementDate: undefined,
      dueDate: undefined,
    }
  });

  useEffect(() => {
    if (cardData) {
      form.reset({
        name: cardData.name,
        initialBalance: Math.abs(parseFloat(cardData.initialBalance)).toString(),
        statementDate: cardData.statementDate,
        dueDate: cardData.dueDate,
      });
    }
  }, [cardData, form])

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
  }, [cardData]);

  const onSubmit = async (values: z.infer<typeof CardValidation>) => {
    try {
      const updatedCard = await updateCard({ id: cardId, ...values })

      toast.success("Credit card updated successfully", {
        description: `${updatedCard.name} has been updated.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update card", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  const handleDeleteClick = async () => {
    const response = await fetch(`/api/cards/${cardId}/transaction-count`);
    const { count } = await response.json();

    if (count > 0) {
      toast.error("Cannot delete card with existing transactions", {
        description: `Please delete the ${count} transctions first.`,
        duration: 10000,
      });

      return;
    }

    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteCard(cardId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Card deleted successfully", {
        description:`${cardData?.name} has been deleted.`,
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete card", {
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
            <SkeletonEditCardDrawerForm />
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
                <DrawerTitle className='text-xl'>
                  Edit credit card
                </DrawerTitle>
                <DrawerDescription>
                  Update your credit card details and information.
                </DrawerDescription>
              </DrawerHeader>

              {/* Wrapper for ScrollArea with gradient indicator */}
              <div className="relative flex-1 min-h-0">
                <ScrollArea ref={scrollRef} className="h-full scrollbar-hide">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className='p-4'>
                        <FormLabel>Card name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g., BPI Blue Mastercard, Metrobank Rewards Plus'
                            {...field}
                            disabled={isUpdating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 flex flex-col gap-2">
                    <FormLabel>Current outstanding balance</FormLabel>
                    <FormDescription>
                      Current debt on this card including all transactions. Updates automatically.
                    </FormDescription>
                    <Input
                      value={cardData?.currentBalance || '0'}
                      disabled={true}
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem className='p-4'>
                        <FormLabel>Initial outstanding balance</FormLabel>
                        <FormDescription>
                          Starting debt when card was added. Edit to correct initial amount.
                        </FormDescription>
                        <FormControl>
                          <Input
                            type='number'
                            className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                            disabled={isUpdating}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="statementDate"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Statement Date</FormLabel>
                        <FormDescription>
                          Day of the month when your statement is generated
                        </FormDescription>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}{getOrdinalSuffix(i + 1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Due Date</FormLabel>
                        <FormDescription>
                          Day of the month when payment is due
                        </FormDescription>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}{getOrdinalSuffix(i + 1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </ScrollArea>

                {/* Gradient overlay indicator - only shows when not at bottom */}
                {showGradient && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              <DrawerFooter className='flex-shrink-0'>
                <Button
                  type="submit"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating credit card" : "Update credit card"}
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
                  {isDeleting ? "Deleting..." : "Delete account"}
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
        title="Delete Card"
        itemName={cardData?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditCardDrawer