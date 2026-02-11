"use client"

import { z } from "zod"
import { ExpenseTypeValidation } from '@/lib/validations/expense';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import SkeletonEditBudgetDrawerForm from "../shared/SkeletonEditBudgetDrawerForm";
import { useExpenseTypeQuery, useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import DeleteDialog from "../shared/DeleteDialog";
import { Separator } from "../ui/separator";
import { Plus, X, Check } from "lucide-react";

interface EditExpenseTypeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  className?: string;
}

type Subcategory = {
  id?: string; // undefined for new, defined for existing
  name: string;
  isDeleted?: boolean;
  isEditing?: boolean;
  originalName?: string; // for tracking changes
};

const EditExpenseTypeDrawer = ({ open, onOpenChange, budgetId, className }: EditExpenseTypeDrawerProps) => {
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
      setOriginalSubcategories(JSON.parse(JSON.stringify(loaded))); // Deep copy
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
      <Drawer repositionInputs={false} open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}
          onInteractOutside={(e) => isUpdating && e.preventDefault()}
          className={`h-[85dvh] ${className || ''}`}
        >
          {isFetching ? (
            <SkeletonEditBudgetDrawerForm />
          ) : error ? (
            <>
              <DrawerHeader className='text-center'>
                <DrawerTitle className='text-xl'>Unable to load budget</DrawerTitle>
                <DrawerDescription>
                  {error || 'Something went wrong while loading your budget details.'}
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
              <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
                <DrawerHeader className="flex-shrink-0">
                  <DrawerTitle className='text-xl'>
                    Edit budget
                  </DrawerTitle>
                  <DrawerDescription>
                    Update your budget details
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className='p-4'>
                        <FormLabel>Budget name</FormLabel>
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
                      <FormItem className='p-4'>
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
                    <div>
                      <FormLabel>Subcategories (Optional)</FormLabel>
                      <FormDescription className="text-xs">
                        Add subcategories for more detailed tracking
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
                </div>

                <DrawerFooter className='flex-shrink-0'>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating budget" : "Update budget"}
                  </Button>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className='hover:text-white'
                      disabled={isUpdating}
                      onClick={handleCancel}
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
                    {isDeleting ? "Deleting..." : "Delete budget"}
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

export default EditExpenseTypeDrawer