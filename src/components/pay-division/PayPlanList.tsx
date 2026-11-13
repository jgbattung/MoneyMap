"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { isPlanUsable, type PayPlanLine } from "@/lib/pay-division"
import type { PayPlan } from "@/hooks/usePayPlansQuery"
import { Money } from "./Money"

function describeLine(line: PayPlanLine): React.ReactNode {
  if (line.kind === "PERCENT") return `${line.name} ${parseFloat(line.value)}%`
  return (
    <>
      {line.name} <Money amount={line.value} /> ({line.from === "SAVE" ? "Save" : "Spend"})
    </>
  )
}

interface PayPlanListProps {
  plans: PayPlan[]
  onSelect: (plan: PayPlan) => void
}

const PayPlanList = ({ plans, onSelect }: PayPlanListProps) => {
  return (
    <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {plans.map((plan) => {
        const usable = isPlanUsable(plan)
        return (
          <li key={plan.id}>
            <button
              type="button"
              onClick={() => onSelect(plan)}
              className="money-map-card-interactive w-full text-left flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold">{plan.name}</span>
                {!usable && <Badge variant="outline">Incomplete</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Save <span className="text-numeric">{parseFloat(plan.savePercent)}%</span> of pay
              </p>
              <p className="text-sm text-muted-foreground">
                Pay lands in {plan.sourceAccount?.name ?? "missing account"}, Save goes to{" "}
                {plan.saveAccount?.name ?? "missing account"}, Spend goes to{" "}
                {plan.spendAccount?.name ?? "missing account"}
                {plan.transferType ? "" : ", no transfer type"}
              </p>
              {plan.lines.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {plan.lines.map((line, i) => (
                    <React.Fragment key={`${line.name}-${i}`}>
                      {i > 0 && ", "}
                      {describeLine(line)}
                    </React.Fragment>
                  ))}
                </p>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default PayPlanList
