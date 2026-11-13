"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { ArrowRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import DeleteDialog from "@/components/shared/DeleteDialog"
import type { PayDivision, PayDivisionItem } from "@/hooks/usePayDivisionsQuery"
import { Money } from "./Money"
import RecordTransferDialog, { type RecordTransferValues } from "./RecordTransferDialog"
import { localDateFromIso } from "./helpers"

export function isItemDone(item: PayDivisionItem): boolean {
  return item.kind === "TRANSFER" ? item.transferTransactionId !== null : item.completedAt !== null
}

export function isDivisionDone(division: PayDivision): boolean {
  return division.items.every(isItemDone)
}

export function countDone(division: PayDivision): number {
  return division.items.filter(isItemDone).length
}

interface DivisionChecklistProps {
  division: PayDivision
  pendingItemIds: Set<string>
  onRecordTransfer: (args: { divisionId: string; itemId: string } & RecordTransferValues) => Promise<unknown>
  onUndoTransfer: (args: { itemId: string; transferTransactionId: string }) => Promise<unknown>
  onToggleEarmark: (args: { divisionId: string; itemId: string; done: boolean }) => Promise<unknown>
  onDelete: (divisionId: string) => Promise<unknown>
  isDeleting?: boolean
}

const DivisionChecklist = ({
  division,
  pendingItemIds,
  onRecordTransfer,
  onUndoTransfer,
  onToggleEarmark,
  onDelete,
  isDeleting = false,
}: DivisionChecklistProps) => {
  const [recordItem, setRecordItem] = useState<PayDivisionItem | null>(null)
  const [undoItem, setUndoItem] = useState<PayDivisionItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const topLevel = division.items.filter((item) => item.parentItemId === null)
  const childrenOf = (id: string) => division.items.filter((item) => item.parentItemId === id)
  const doneCount = countDone(division)

  const onTick = (item: PayDivisionItem, checked: boolean) => {
    if (item.kind === "TRANSFER") {
      if (checked) setRecordItem(item)
      else setUndoItem(item)
      return
    }
    void onToggleEarmark({ divisionId: division.id, itemId: item.id, done: checked }).catch(() => {
      // The hook already shows an error toast.
    })
  }

  const confirmUndo = async () => {
    const item = undoItem
    if (!item?.transferTransactionId) return
    setUndoItem(null)
    try {
      await onUndoTransfer({ itemId: item.id, transferTransactionId: item.transferTransactionId })
    } catch {
      // The hook already shows an error toast.
    }
  }

  const confirmDelete = async () => {
    try {
      await onDelete(division.id)
      setDeleteOpen(false)
    } catch {
      // The hook already shows an error toast.
    }
  }

  const renderRow = (item: PayDivisionItem, nested: boolean) => {
    const done = isItemDone(item)
    const pending = pendingItemIds.has(item.id)
    const actual = item.transferTransaction?.amount
    const differs = actual !== undefined && Math.abs(actual - parseFloat(item.amount)) >= 0.005
    const inputId = `pay-item-${item.id}`

    return (
      <li
        key={item.id}
        className={`flex items-center gap-3 py-2 ${nested ? "pl-8" : ""} ${pending ? "opacity-60" : ""}`}
        aria-busy={pending}
      >
        <Checkbox
          id={inputId}
          checked={done}
          disabled={pending}
          aria-label={done ? `Undo ${item.label}` : `Mark ${item.label} as done`}
          onCheckedChange={(checked) => onTick(item, checked === true)}
        />
        <div className="flex-1 min-w-0">
          <label htmlFor={inputId} className="font-medium cursor-pointer">
            {item.label}
          </label>
          {item.detail && <span className="ml-2 text-sm text-muted-foreground">{item.detail}</span>}
          {item.kind === "TRANSFER" && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {item.fromAccount?.name ?? "Unknown account"}
              <ArrowRight className="h-3 w-3" aria-hidden />
              {item.toAccount?.name ?? "Unknown account"}
              {item.transferTransaction && (
                <span>
                  {" - sent "}
                  {format(localDateFromIso(item.transferTransaction.date), "MMM d")}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          {differs ? (
            <>
              <Money amount={actual} />
              <p className="text-xs text-muted-foreground">
                planned <Money amount={item.amount} />
              </p>
            </>
          ) : (
            <Money amount={item.kind === "TRANSFER" && actual !== undefined ? actual : item.amount} />
          )}
        </div>
      </li>
    )
  }

  return (
    <section className="money-map-card flex flex-col gap-3" aria-label={`${division.planName} division`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {format(localDateFromIso(division.payDate), "MMM d, yyyy")} - {division.planName}
          </p>
          <p className="text-sm text-muted-foreground">
            Pay <Money amount={division.payAmount} /> - {doneCount} of {division.items.length} done
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Delete ${division.planName} checklist`}
          className="border-error-700 text-error-700 hover:bg-error-700 hover:text-white"
          onClick={() => setDeleteOpen(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      <dl className="flex gap-6 text-sm">
        <div>
          <dt className="text-muted-foreground">Spend</dt>
          <dd>
            <Money amount={division.spendAmount} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Save ({parseFloat(division.savePercent)}%)</dt>
          <dd>
            <Money amount={division.saveAmount} />
          </dd>
        </div>
      </dl>

      <ul className="flex flex-col divide-y divide-border/50">
        {topLevel.map((item) => (
          <React.Fragment key={item.id}>
            {renderRow(item, false)}
            {childrenOf(item.id).map((child) => renderRow(child, true))}
          </React.Fragment>
        ))}
      </ul>

      <RecordTransferDialog
        item={recordItem}
        onOpenChange={(open) => {
          if (!open) setRecordItem(null)
        }}
        onConfirm={(values) =>
          onRecordTransfer({ divisionId: division.id, itemId: recordItem?.id ?? "", ...values })
        }
      />

      <AlertDialog open={undoItem !== null} onOpenChange={(open) => !open && setUndoItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the recorded transfer
              {undoItem?.transferTransaction && (
                <>
                  {" of "}
                  <Money amount={undoItem.transferTransaction.amount} />
                </>
              )}{" "}
              and restores both account balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmUndo()
              }}
              className="bg-error-700 hover:bg-error-800 transition-colors text-white"
            >
              Undo transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Delete this checklist?"
        description="Only the checklist is removed. Transfers already recorded from it are kept, and account balances do not change."
      />
    </section>
  )
}

export default DivisionChecklist
