"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod"
import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import SkeletonEditBudgetForm from "../shared/SkeletonEditBudgetForm";
import { useExpenseTypeQuery, useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import DeleteDialog from "../shared/DeleteDialog";
import { Separator } from "../ui/separator";
import { Plus, X, Check } from "lucide-react";

interface EditExpenseTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  budgetId: string;
}

type Subcategory = {
  id?: string;
  name: string;
  isDeleted?: boolean;
  isEditing?: boolean;
  originalName?: string;
};

const EditExpenseTypeSheet = ({ open, onOpenChange, className, budgetId }: EditExpenseTypeSheetProps) => {
  const { updateBudget, isUpdating, deleteBudget, isDeleting } = useExpenseTypesQuery();
  const { budgetData, isFetching, error } = useExpenseTypeQuery(budgetId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [originalSubcategories, setOriginalSubcategories] = useState<Subcategory[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const form = useForm<z.infer<typeof ExpenseTypeValidation>>({
    resolver: zodResolver(ExpenseTypeValidation),
    defaultValues: {
      name: "",
      monthlyBudget: "",
    }
  });

  useEffect(() => {
    if (budgetData) {
      form.reset({
        name: budgetData.name,
        monthlyBudget: budgetData.monthlyBudget || ''
      });

      // Load subcategories
      const loaded = (budgetData.subcategories || []).map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        originalName: sub.name,
        isDeleted: false,
        isEditing: false,
      }));
      
      setSubcategories(loaded);
      setOriginalSubcategories(JSON.parse(JSON.stringify(loaded)));
    }
  }, [budgetData, form]);

  const generateTempId = () => `temp-${Date.now()}-${Math.random()}`;

  const addSubcategory = () => {
    const trimmedName = newSubcategoryName.trim();
    if (!trimmedName) {
      toast.error("Subcategory name cannot be empty");
      return;
    }

    // Check for duplicates (including deleted ones that haven't been saved yet)
    const existingNames = subcategories
      .filter(sub => !sub.isDeleted)
      .map(sub => sub.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast.error("Subcategory already exists");
      return;
    }

    setSubcategories([
      ...subcategories, 
      { 
        id: undefined, // No ID means it's new
        name: trimmedName,
        isDeleted: false,
      }
    ]);
    setNewSubcategoryName("");
  };

  const startEditing = (sub: Subcategory) => {
    setEditingId(sub.id || generateTempId());
    setEditingName(sub.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = (sub: Subcategory) => {
    const trimmedName = editingName.trim();
    
    if (!trimmedName) {
      toast.error("Subcategory name cannot be empty");
      return;
    }

    // Check for duplicates
    const existingNames = subcategories
      .filter(s => s.id !== sub.id && !s.isDeleted)
      .map(s => s.name.toLowerCase());
    
    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast.error("Subcategory already exists");
      return;
    }

    setSubcategories(subcategories.map(s => 
      s.id === sub.id 
        ? { ...s, name: trimmedName }
        : s
    ));
    
    cancelEditing();
  };

  const markAsDeleted = (sub: Subcategory) => {
    setSubcategories(subcategories.map(s =>
      s.id === sub.id
        ? { ...s, isDeleted: true }
        : s
    ));
  };

  const handleCancel = () => {
    // Reset to original state
    form.reset({
      name: budgetData?.name,
      monthlyBudget: budgetData?.monthlyBudget || ''
    });
    setSubcategories(JSON.parse(JSON.stringify(originalSubcategories)));
    setNewSubcategoryName("");
    cancelEditing();
    onOpenChange(false);
  };

  const calculateChanges = () => {
    const toCreate = subcategories.filter(s => !s.id && !s.isDeleted);
    
    const toUpdate = subcategories.filter(s => 
      s.id && 
      !s.isDeleted && 
      s.originalName && 
      s.name !== s.originalName
    );
    
    const toDelete = subcategories
      .filter(s => s.id && s.isDeleted)
      .map(s => s.id as string);

    return { toCreate, toUpdate, toDelete };
  };

  const onSubmit = async (values: z.infer<typeof ExpenseTypeValidation>) => {
    try {
      const changes = calculateChanges();
      
      const payload = {
        id: budgetId,
        ...values,
        subcategoryChanges: {
          toCreate: changes.toCreate.map(s => ({ name: s.name })),
          toUpdate: changes.toUpdate.map(s => ({ id: s.id as string, name: s.name })),
          toDelete: changes.toDelete,
        }
      };

      const updatedBudget = await updateBudget(payload);

      toast.success("Budget updated successfully", {
        description: `${updatedBudget.name} has been updated.`,
        duration: 5000
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update budget", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000
      });
    }
  };

  const handleDeleteClick = async () => {
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    try {
      const result = await deleteBudget(budgetId);

      setDeleteDialogOpen(false);
      onOpenChange(false);

      toast.success("Budget deleted successfully", {
        description: result.reassignedCount > 0 
          ? `${result.reassignedCount} transaction(s) reassigned to 'Uncategorized'.`
          : `${budgetData?.name} has been deleted.`,
      });
    } catch (error: any) {
      toast.error("Failed to delete budget", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000
      });
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
          onInteractOutside={(e) => isUpdating && e.preventDefault()}
          className={`${className} w-[600px] sm:max-w-[600px] py-3 px-2`}
        >
          {isFetching ? (
            <SkeletonEditBudgetForm />
          ) : error ? (
            <>
              <SheetHeader className='text-center'>
                <SheetTitle className='text-2xl'>Unable to load budget</SheetTitle>
                <SheetDescription>
                  {error || 'Something went wrong while loading your budget details.'}
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
                  <SheetTitle className="text-2xl">Edit budget</SheetTitle>
                  <SheetDescription>
                    Update your budget details
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
                          disabled={isUpdating}
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
                          disabled={isUpdating}
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
                      Add subcategories for more detailed tracking (optional)
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
                      disabled={isUpdating}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addSubcategory}
                      disabled={isUpdating}
                      className="hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Subcategories List */}
                  {subcategories.filter(s => !s.isDeleted).length > 0 && (
                    <div className="space-y-2">
                      {subcategories
                        .filter(s => !s.isDeleted)
                        .map((subcategory) => {
                          const isEditing = editingId === subcategory.id;
                          
                          return (
                            <div
                              key={subcategory.id || generateTempId()}
                              className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                            >
                              {isEditing ? (
                                <>
                                  <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveEdit(subcategory);
                                      } else if (e.key === 'Escape') {
                                        cancelEditing();
                                      }
                                    }}
                                    className="h-7 text-sm"
                                    autoFocus
                                    disabled={isUpdating}
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => saveEdit(subcategory)}
                                      disabled={isUpdating}
                                      className="h-6 w-6 ml-2"
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={cancelEditing}
                                      disabled={isUpdating}
                                      className="h-6 w-6"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="text-sm cursor-pointer flex-1"
                                    onClick={() => startEditing(subcategory)}
                                  >
                                    {subcategory.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => markAsDeleted(subcategory)}
                                    disabled={isUpdating}
                                    className="h-6 w-6"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <SheetFooter>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating budget" : "Update budget"}
                  </Button>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className='hover:text-white'
                      disabled={isUpdating}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                </SheetFooter>

                <Separator className='mt-2 mb-6' />

                <div className='px-4 pb-4'>
                  <Button
                    type='button'
                    variant='outline'
                    className="w-full text-error-700 hover:text-error-600 hover:bg-error-50 border-error-300"
                    onClick={handleDeleteClick}
                    disabled={isUpdating || isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete budget"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </SheetContent>
      </Sheet>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        description={
          <>
            Are you sure you want to delete <span className="font-semibold">{budgetData?.name}</span>? 
            Any transactions using this budget will be reassigned to &apos;Uncategorized&apos;. This action cannot be undone.
          </>
        }
        title="Delete budget"
        isDeleting={isDeleting}
      />
    </>
  )
}

export default EditExpenseTypeSheet