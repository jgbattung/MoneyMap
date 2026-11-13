"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { ArrowRight, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { PayDivisionItem } from "@/hooks/usePayDivisionsQuery"
import { formatDateForAPI } from "@/lib/utils"
import { isValidMoney, normalizeAmount } from "./helpers"

export type RecordTransferValues = { amount: string; date: string }

interface RecordTransferDialogProps {
  /** The TRANSFER row being ticked; null keeps the dialog closed. */
  item: PayDivisionItem | null
  onOpenChange: (open: boolean) => void
  /** Resolves when the transfer is recorded; rejects (after the hook toasts) on failure. */
  onConfirm: (values: RecordTransferValues) => Promise<unknown>
}

const RecordTransferForm = ({
  item,
  onOpenChange,
  onConfirm,
}: Omit<RecordTransferDialogProps, "item"> & { item: PayDivisionItem }) => {
  const [amount, setAmount] = useState(() => String(parseFloat(item.amount)))
  const [date, setDate] = useState<Date>(() => new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalized = normalizeAmount(amount)
  const valid = isValidMoney(normalized)

  const confirm = async () => {
    if (!valid || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onConfirm({ amount: normalized, date: formatDateForAPI(date) })
      onOpenChange(false)
    } catch {
      // The hook already shows an error toast; keep the dialog open so the user can retry.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Record transfer</DialogTitle>
        <DialogDescription>
          This creates the transfer and updates both account balances.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1">
            <p className="text-muted-foreground">From</p>
            <p className="font-medium">{item.fromAccount?.name ?? "Unknown account"}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="text-muted-foreground">To</p>
            <p className="font-medium">{item.toAccount?.name ?? "Unknown account"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="record-transfer-amount">Amount</Label>
          <CurrencyInput
            id="record-transfer-amount"
            placeholder="0"
            value={amount}
            onValueChange={setAmount}
            disabled={isSubmitting}
          />
          {!valid && amount !== "" && (
            <p className="text-sm text-text-error">Enter a positive amount with at most 2 decimals</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal hover:text-white"
                disabled={isSubmitting}
              >
                {format(date, "MMMM, d, yyyy")}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                onDayClick={(day) => {
                  setDate(day)
                  setCalendarOpen(false)
                }}
                disabled={(day) => day > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" className="hover:text-white" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={!valid || isSubmitting}>
          {isSubmitting ? "Recording" : "Confirm"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

const RecordTransferDialog = ({ item, onOpenChange, onConfirm }: RecordTransferDialogProps) => {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      {item && <RecordTransferForm key={item.id} item={item} onOpenChange={onOpenChange} onConfirm={onConfirm} />}
    </Dialog>
  )
}

export default RecordTransferDialog
