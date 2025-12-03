"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useNetWorthTarget } from '@/hooks/useNetWorthTarget'
import { toast } from 'sonner'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

interface SetTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTarget: number | null;
  currentTargetDate: string | null;
}

const SetTargetDialog = ({ open, onOpenChange, currentTarget, currentTargetDate }: SetTargetDialogProps) => {
  const { updateTarget, isUpdating } = useNetWorthTarget();
  
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);

  // Initialize form values when dialog opens or current values change
  useEffect(() => {
    if (open) {
      setTargetAmount(currentTarget ? currentTarget.toString() : '');
      setTargetDate(currentTargetDate ? new Date(currentTargetDate) : undefined);
    }
  }, [open, currentTarget, currentTargetDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate target amount
    const amount = targetAmount ? parseFloat(targetAmount) : null;
    if (amount !== null && (isNaN(amount) || amount < 0)) {
      toast.error('Invalid target amount', {
        description: 'Please enter a valid positive number',
      });
      return;
    }

    try {
      await updateTarget({
        target: amount,
        targetDate: targetDate ? targetDate.toISOString() : null,
      });

      toast.success('Net worth target updated', {
        description: amount 
          ? `Target set to ₱${amount.toLocaleString('en-PH')}` 
          : 'Target cleared',
      });

      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update target', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleClearTarget = async () => {
    try {
      await updateTarget({
        target: null,
        targetDate: null,
      });

      toast.success('Net worth target cleared');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to clear target', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Net Worth Target</DialogTitle>
            <DialogDescription>
              Set a target for your net worth and track your progress toward financial goals.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Target Amount */}
            <div className="grid gap-2">
              <Label htmlFor="target-amount">Target amount</Label>
              <Input
                id="target-amount"
                type="number"
                placeholder="e.g., 1000000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                disabled={isUpdating}
                className='[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
              />
            </div>

            {/* Target Date */}
            <div className="grid gap-2">
              <Label htmlFor="target-date">Target date <span className='text-muted-foreground'>(optional)</span></Label>
              <Popover open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen} modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isUpdating}
                    className="justify-start text-left font-normal hover:text-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate ?? undefined}
                    captionLayout="dropdown"
                    startMonth={new Date()}
                    endMonth={new Date(new Date().getFullYear() + 10, 11)}
                    onDayClick={(date) => {
                      setTargetDate(date);
                      setCalendarDialogOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {currentTarget && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearTarget}
                disabled={isUpdating}
                className="w-full sm:w-auto text-error-600 hover:text-error-700 hover:bg-error-50 border-error-300"
              >
                Clear Target
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
                className="flex-1 sm:flex-none hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="flex-1 sm:flex-none"
              >
                {isUpdating ? 'Saving...' : 'Save Target'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default SetTargetDialog