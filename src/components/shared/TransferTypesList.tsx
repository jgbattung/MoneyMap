"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Icons } from '../icons'
import { useTransferTypesQuery } from '@/hooks/useTransferTypesQuery'
import { toast } from 'sonner'
import { Trash2, Check, X, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const TransferTypesList = () => {
  const { transferTypes, isLoading, error, createTransferType, updateTransferType, deleteTransferType, isDeleting } = useTransferTypesQuery();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string; name: string } | null>(null);

  const addNewRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

  // Click outside handler for Add New mode
  useEffect(() => {
    if (!isAdding) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (addNewRef.current && !addNewRef.current.contains(event.target as Node)) {
        handleCancelAdd();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdding]);

  // Click outside handler for Edit mode
  useEffect(() => {
    if (!editingId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(event.target as Node)) {
        handleCancelEdit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId]);

  const handleEditClick = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || !editingId) return;
    
    setIsUpdating(true);
    try {
      const updatedType = await updateTransferType({ id: editingId, name: editValue.trim() });
      toast.success(`${updatedType.name} has been updated successfully`);
      setEditingId(null);
      setEditValue('');
    } catch (error) {
      toast.error('Failed to update transfer type', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 6000
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddNew = async () => {
    if (!newTypeName.trim()) return;
    
    setIsCreating(true);
    try {
      const newType = await createTransferType({ name: newTypeName.trim() });
      toast.success(`${newType.name} has been created successfully`);
      setNewTypeName('');
      setIsAdding(false);
    } catch (error) {
      toast.error('Failed to create transfer type', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 6000
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewTypeName('');
  };

  const openDeleteDialog = (id: string, name: string) => {
    setTypeToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    
    try {
      await deleteTransferType(typeToDelete.id);
      toast.success(`${typeToDelete.name} has been deleted`);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    } catch (error) {
      toast.error('Failed to delete transfer type', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 6000
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Icons.error className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Failed to load transfer types</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Add New Section */}
        <div className="border border-dashed border-border rounded-lg p-4">
          {!isAdding ? (
            <Button
              variant="ghost"
              onClick={() => setIsAdding(true)}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add new transfer type
            </Button>
          ) : (
            <div ref={addNewRef} className="flex flex-row gap-2 flex-1">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Enter transfer type name..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNew();
                  if (e.key === 'Escape') handleCancelAdd();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddNew}
                  disabled={!newTypeName.trim() || isCreating}
                >
                  <Check className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Save</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAdd}
                  disabled={isCreating}
                >
                  <X className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Cancel</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Transfer Types List */}
        <div className="space-y-2">
          {transferTypes.map((transferType) => (
            <div
              key={transferType.id}
              className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              {editingId === transferType.id ? (
                // Edit Mode
                <div ref={editRef} className="flex flex-row gap-2 flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editValue.trim() || isUpdating}
                    >
                      <Check className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Save</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Cancel</span>
                    </Button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <button
                    onClick={() => handleEditClick(transferType.id, transferType.name)}
                    className="flex-1 text-left hover:text-primary transition-colors cursor-pointer"
                  >
                    {transferType.name}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteDialog(transferType.id, transferType.name)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {transferTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transfer types yet. Add your first one above!</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transfer Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{typeToDelete?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-error-700 hover:bg-error-800 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransferTypesList;