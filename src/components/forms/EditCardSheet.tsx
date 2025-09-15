"use client"

import { CardValidation } from "@/lib/validations/account";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getOrdinalSuffix } from "@/lib/utils";
import SkeletonEditCardSheetForm from "../shared/SkeletonEditCardSheetForm";
import { useCardQuery, useCardsQuery } from "@/hooks/useCardsQuery";


interface EditCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  cardId: string;
}

const EditCardSheet = ({ open, onOpenChange, className, cardId }: EditCardSheetProps) => {
  const { updateCard, isUpdating } = useCardsQuery();
  const { cardData, isFetching, error } = useCardQuery(cardId);

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
  }, [cardData, form]);


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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        {isFetching ? (
          <SkeletonEditCardSheetForm />
        ) : error ? (
        <>
          <SheetHeader className='text-center'>
            <SheetTitle className='text-2xl'>Unable to load account</SheetTitle>
            <SheetDescription>
              {error || 'Something went wrong while loading your account details.'}
            </SheetDescription>
          </SheetHeader>
          
          <div className='flex flex-col gap-3 p-6'>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try again
            </Button>
            <Button
              variant="outline"
              
              onClick={() => onOpenChange(false)}
              className='hover:text-white'
            >
              Close
            </Button>
          </div>
        </>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader>
              <SheetTitle className='text-2xl'>Edit credit card</SheetTitle>
              <SheetDescription>
                Update your credit card details and information.
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
                      disabled={isUpdating}
                    />
                  </FormControl>
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
                <FormItem className="p-4">
                  <FormLabel>Initial outstanding balance</FormLabel>
                  <FormDescription>
                    Starting debt when card was added. Edit to correct initial amount.
                  </FormDescription>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='0'
                      className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                      {...field}
                      disabled={isUpdating}
                    />
                  </FormControl>
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

            <SheetFooter>
              <Button
                type="submit"
                disabled={isUpdating}
              >
                {isUpdating ? "Updating credit card" : "Update credit card"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default EditCardSheet