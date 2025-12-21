"use client"

import { z } from "zod"
import React, { useState } from 'react'
import { ExpenseTypeValidation } from "@/lib/validations/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import { Plus, X } from "lucide-react";

interface CreateExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
}

type Subcategory = {
  tempId: string;
  name: string;
};

const CreateExpenseTypeSheet = ({ open, onOpenChange, className }: CreateExpenseTypeSheetProps) => {
  const { createBudget, isCreating } = useExpenseTypesQuery();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
    }
  });

  const generateTempId = () => `temp-${Date.now()}-${Math.random()}`;

  const addSubcategory = () => {
    const trimmedName = newSubcategoryName.trim();
    if (!trimmedName) {
      toast.error("Subcategory name cannot be empty");
      return;
    }

    // Check for duplicates
    if (subcategories.some(sub => sub.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Subcategory already exists");
      return;
    }

    setSubcategories([...subcategories, { tempId: generateTempId(), name: trimmedName }]);
    setNewSubcategoryName("");
  };

  const removeSubcategory = (tempId: string) => {
    setSubcategories(subcategories.filter(sub => sub.tempId !== tempId));
  };

  const handleCancel = () => {
    form.reset();
    setSubcategories([]);
    setNewSubcategoryName("");
    onOpenChange(false);
  };

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    try {
      const payload = {
        ...values,
        subcategories: subcategories.map(sub => ({ name: sub.name })),
      };

      const newBudget = await createBudget(payload);

      toast.success("Budget created successfully", {
        description: `${newBudget.name} has been added to your budgets.`,
        duration: 5000
      });
      
      form.reset();
      setSubcategories([]);
      setNewSubcategoryName("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create budget", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onEscapeKeyDown={(e) => isCreating && e.preventDefault()}
        onInteractOutside={(e) => isCreating && e.preventDefault()}
        className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader>
              <SheetTitle className='text-2xl'>Add Budget</SheetTitle>
              <SheetDescription>
                Create a budget category to track your monthly spending and stay on target.
              </SheetDescription>
            </SheetHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Groceries, transportation, entertainment, shopping'
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyBudget"
              render={({ field }) => (
                <FormItem className="p-4">
                  <FormLabel>Monthly budget</FormLabel>
                  <FormDescription>
                    Set a monthly spending limit for this category (optional).
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Subcategories Section */}
            <div className="p-4 space-y-3">
              <div className="flex flex-col gap-2">
                <FormLabel>Subcategories</FormLabel>
                <FormDescription className="text-sm">
                  Add subcategories for this budget for more detailed tracking (optional)
                </FormDescription>
              </div>

              {/* Add Subcategory Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., GrabCar, Train, Bus"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubcategory();
                    }
                  }}
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addSubcategory}
                  disabled={isCreating}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Subcategories List */}
              {subcategories.length > 0 && (
                <div className="space-y-2">
                  {subcategories.map((subcategory) => (
                    <div
                      key={subcategory.tempId}
                      className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                    >
                      <span className="text-sm">{subcategory.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubcategory(subcategory.tempId)}
                        disabled={isCreating}
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SheetFooter>
              <Button
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Adding budget" : "Add budget"}
              </Button>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  className='hover:text-white'
                  disabled={isCreating}
                  onClick={handleCancel}
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

export default CreateExpenseTypeSheet