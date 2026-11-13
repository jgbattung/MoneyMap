"use client"

import React from "react"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import type { PayPlan } from "@/hooks/usePayPlansQuery"
import PayPlanForm from "./PayPlanForm"

interface PayPlanDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Omit to create a new plan. */
  plan?: PayPlan | null
  className?: string
}

const PayPlanDrawer = ({ open, onOpenChange, plan, className }: PayPlanDrawerProps) => {
  return (
    <Drawer repositionInputs={false} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={`h-[85dvh] ${className ?? ""}`}>
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle className="text-xl">{plan ? "Edit plan" : "New plan"}</DrawerTitle>
          <DrawerDescription>
            A plan sets where pay lands, where Save and Spend go, and how Save is split.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <PayPlanForm key={plan?.id ?? "new"} plan={plan} onDone={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default PayPlanDrawer
