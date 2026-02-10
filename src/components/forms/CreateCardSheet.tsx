"use client"

import { z } from "zod"
import React, { useMemo, useState, useRef } from 'react'
import { CardValidation } from "@/lib/validations/account";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getOrdinalSuffix } from "@/lib/utils";
import { useCardsQuery } from "@/hooks/useCardsQuery";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

const CreateCardSheet = ({ open, onOpenChange, className }: CreateCardSheetProps) => {
  const { cards, createCard, isCreating } = useCardsQuery();
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

  const onSubmit = async (values: z.infer<typeof CardValidation>) => {
    try {
      const newCard = await createCard(values);

      toast.success("Card created successfully", {
        description: `${newCard.name} has been added to your cards.`,
        duration: 5000,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create card", {
        description: error instanceof Error ? error.message : "Please check your information and try again",
        duration: 6000,
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
              <SheetTitle className='text-2xl'>Add Credit Card</SheetTitle>
              <SheetDescription>
                Add a new credit card to track your balance, payments, and due dates.
              </SheetDescription>
            </SheetHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Card Name</FormLabel>
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
                <FormItem className="p-4">
                  <FormLabel>Outstanding balance</FormLabel>
                  <FormDescription>
                    Current amount owed on this credit card 
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='0'
                      className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
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
                    <PopoverContent className="w-[400px] p-0">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding credit card" : "Add credit card"}
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

export default CreateCardSheet