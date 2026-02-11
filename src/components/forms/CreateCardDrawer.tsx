"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { z } from "zod"
import { CardValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { getOrdinalSuffix, cn } from '@/lib/utils';
import { useCardsQuery } from '@/hooks/useCardsQuery';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

interface CreateCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateCardDrawer = ({ open, onOpenChange, className }: CreateCardDrawerProps) => {
  const { cards, createCard, isCreating } = useCardsQuery();
  const [showGradient, setShowGradient] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const previousValueRef = useRef<string>("");
  const committedRef = useRef<boolean>(false);

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
    }
  });

  useEffect(() => {
    const checkScroll = () => {
      const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      
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
        checkScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      scrollElement?.removeEventListener('scroll', checkScroll);
    };
  }, [open]);

  const onSubmit = async (values: z.infer<typeof CardValidation>) => {
    try {
      const newCard = await createCard(values);

      toast.success("Card created successfully", {
        description: `${newCard.name} has been added to your cards.`,
        duration: 5000
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create card", {
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
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full max-h-[85dvh]'>
            <DrawerHeader className='flex-shrink-0'>
              <DrawerTitle className='text-xl'>
                Add Credit Card
              </DrawerTitle>
              <DrawerDescription>
                Add a new credit card to track your balance, payments, and due dates.
              </DrawerDescription>
            </DrawerHeader>

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
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem className='p-4'>
                      <FormLabel>Outstanding balance</FormLabel>
                      <FormDescription>
                        Current amount owed on this credit card 
                      </FormDescription>
                      <FormControl>
                        <Input
                          type='number'
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
                            previousValueRef.current = field.value || "";
                            committedRef.current = false;
                            setInputValue("");
                          } else {
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
                              disabled={isCreating}
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
                        <PopoverContent className="w-[350px] p-0">
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
                          disabled={isCreating}
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
                          disabled={isCreating}
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
              
              {showGradient && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
              )}
            </div>

            <DrawerFooter className='flex-shrink-0'>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding credit card" : "Add credit card"}
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

export default CreateCardDrawer