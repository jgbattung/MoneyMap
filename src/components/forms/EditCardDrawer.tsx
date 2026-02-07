"use client"

import { CardValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form';
import { z } from "zod"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getOrdinalSuffix, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import SkeletonEditCardDrawerForm from '../shared/SkeletonEditCardDrawerForm';
import { useCardQuery, useCardsQuery } from '@/hooks/useCardsQuery';
import { ScrollArea } from '../ui/scroll-area';
import DeleteDialog from '../shared/DeleteDialog';
import { Separator } from '../ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

interface EditCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  cardId: string;
}

const EditCardDrawer = ({ open, onOpenChange, className, cardId }: EditCardDrawerProps) => {
  const { cards, updateCard, isUpdating, deleteCard, isDeleting } = useCardsQuery();
  const { cardData, isFetching, error } = useCardQuery(cardId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGradient, setShowGradient] = useState(true);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const previousValueRef = useRef<string>("");
  const committedRef = useRef<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Extract unique card groups from existing cards
  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    cards.forEach(card => {
      if (card.cardGroup) {
        groups.add(card.cardGroup);
      }
    });
    return Array.from(groups).sort();
  }, [cards]);

  const form = useForm<z.infer<typeof CardValidation>>({
    resolver: zodResolver(CardValidation),
    defaultValues: {
      name: '',
      initialBalance: '',
      cardGroup: '',
      statementDate: undefined,
      dueDate: undefined,
    }
  });

  useEffect(() => {
    if (cardData) {
      const dbInitialBalance = parseFloat(cardData.initialBalance.toString());
      const displayInitialBalance = -dbInitialBalance;
      
      form.reset({
        name: cardData.name,
        initialBalance: displayInitialBalance.toString(),
        cardGroup: cardData.cardGroup || '',
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
      const displayBalance = parseFloat(values.initialBalance);
      const dbBalance = -displayBalance;
      
      const updatedCard = await updateCard({ 
        id: cardId, 
        ...values,
        initialBalance: dbBalance.toString()
      });

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
        description: `Please delete the ${count} transactions first.`,
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

  const formattedCurrentBalance = cardData 
    ? (-parseFloat(cardData.currentBalance.toString())).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '0.00';

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
                      value={`₱${formattedCurrentBalance}`}
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
                    name="cardGroup"
                    render={({ field }) => (
                      <FormItem className="p-4">
                        <FormLabel>Card Group (Optional)</FormLabel>
                        <FormDescription>
                          Group cards from the same bank together
                        </FormDescription>
                        <Popover 
                          open={groupPopoverOpen} 
                          onOpenChange={(open) => {
                            if (open) {
                              // Store current value when opening
                              previousValueRef.current = field.value || "";
                              committedRef.current = false;
                              setInputValue("");
                            } else {
                              // Revert to previous value if user didn't commit
                              if (!committedRef.current) {
                                field.onChange(previousValueRef.current);
                              }
                              setInputValue("");
                              committedRef.current = false;
                            }
                            setGroupPopoverOpen(open);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={isUpdating}
                                className={cn(
                                  "w-full justify-between hover:text-secondary-400 font-medium",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value || "Select or create a group"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="max-md:w-[345px] w-[1000px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search or type new group name..."
                                value={inputValue}
                                onValueChange={(value) => {
                                  setInputValue(value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && inputValue.trim()) {
                                    e.preventDefault();
                                    field.onChange(inputValue.trim());
                                    committedRef.current = true;
                                    setGroupPopoverOpen(false);
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-sm text-muted-foreground">
                                    {inputValue.trim() 
                                      ? `Press Enter to create "${inputValue.trim()}"` 
                                      : "Type to search existing groups or create a new one"}
                                  </div>
                                </CommandEmpty>
                                {existingGroups.length > 0 && (
                                  <CommandGroup heading="Existing Groups">
                                    {existingGroups.map((group) => (
                                      <CommandItem
                                        key={group}
                                        value={group}
                                        onSelect={() => {
                                          field.onChange(group);
                                          committedRef.current = true;
                                          setGroupPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === group ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {group}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                                {field.value && (
                                  <CommandGroup>
                                    <CommandItem
                                      value=""
                                      onSelect={() => {
                                        field.onChange("");
                                        committedRef.current = true;
                                        setGroupPopoverOpen(false);
                                      }}
                                    >
                                      Clear selection
                                    </CommandItem>
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                        <FormMessage />
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
                        <FormMessage />
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