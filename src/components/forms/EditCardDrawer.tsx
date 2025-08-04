"use client"

import { CardValidation } from '@/lib/validations/account';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
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


interface EditCardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  cardId: string;
  onCardUpdated ?: () => void;
}

interface CardData {
  id: string;
  name: string;
  initialBalance: string;
  statementDate: number;
  dueDate: number;
}

const EditCardDrawer = ({ open, onOpenChange, className, cardId, onCardUpdated }: EditCardDrawerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);

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
    if (open && cardId) {
      const fetchCardData = async () => {
        setIsFetching(true);
        try {
          const response = await fetch(`/api/cards/${cardId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch credit card');
          }

          const card = await response.json();

          console.log(card)

          setCardData(card);

          form.reset({
            name: card.name,
            initialBalance: Math.abs(card.initialBalance).toString(),
            statementDate: card.statementDate,
            dueDate: card.dueDate,
          });
        } catch (error) {
          if (error instanceof Error) {
            toast.error("Failed to update credit card", {
              description: error.message || "Please check your information and try again",
              duration: 6000
            })
          } else {
            toast.error("Something went wrong", {
              description: "Unable to update credit card. Please try again.",
              duration: 6000
            })
          }
        } finally {
          setIsFetching(false);
        }
      }

      fetchCardData();
    }
  }, [open, cardId, form])

  const onSubmit = async (values: z.infer<typeof CardValidation>) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        toast.error('Failed to updated credit card', {
          duration: 6000
        })
      }

      const updatedCard = await response.json();
      if (updatedCard) {
        toast.success("Credit card updated successfully", {
          description: `${updatedCard.name} has been updated.`,
          duration: 5000
        });
        form.reset();
        onOpenChange(false);
        onCardUpdated?.();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Failed to update credit card", {
          description: error.message || "Please check your information and try again.",
          duration: 6000
        })
      } else {
        toast.error("Something went wrong", {
          description: "Unable to update credit card. Please try again.",
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
          <SkeletonEditCardDrawerForm />
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DrawerHeader>
              <DrawerTitle className='text-xl'>
                Edit credit card
              </DrawerTitle>
              <DrawerDescription>
                Update your credit card details and information.
              </DrawerDescription>
            </DrawerHeader>

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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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

            <DrawerFooter>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Updating credit card" : "Update credit card"}
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

export default EditCardDrawer