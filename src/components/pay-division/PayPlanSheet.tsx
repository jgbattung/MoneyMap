"use client"

import React from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { PayPlan } from "@/hooks/usePayPlansQuery"
import PayPlanForm from "./PayPlanForm"

interface PayPlanSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Omit to create a new plan. */
  plan?: PayPlan | null
  className?: string
}

const PayPlanSheet = ({ open, onOpenChange, plan, className }: PayPlanSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`${className ?? ""} w-[600px] sm:max-w-[600px] py-3 px-2 overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle className="text-2xl">{plan ? "Edit plan" : "New plan"}</SheetTitle>
          <SheetDescription>
            A plan sets where pay lands, where Save and Spend go, and how Save is split.
          </SheetDescription>
        </SheetHeader>
        <PayPlanForm key={plan?.id ?? "new"} plan={plan} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

export default PayPlanSheet
