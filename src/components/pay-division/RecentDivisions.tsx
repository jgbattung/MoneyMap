"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { ChevronDown, ClipboardList } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { usePayDivisionsQuery, type PayDivision } from "@/hooks/usePayDivisionsQuery"
import DivisionChecklist, { countDone, isDivisionDone } from "./DivisionChecklist"
import { Money } from "./Money"
import { localDateFromIso } from "./helpers"

const RecentDivisions = () => {
  const {
    payDivisions,
    isLoading,
    error,
    recordTransfer,
    undoTransfer,
    toggleEarmark,
    deleteDivision,
    isDeleting,
    pendingItemIds,
  } = usePayDivisionsQuery()
  const [openId, setOpenId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="recent-divisions-skeleton">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-text-error">Failed to load recent divisions: {error}</p>
  }

  if (payDivisions.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No divisions yet"
        description="Start a checklist above and it will show up here until every transfer is done."
        variant="widget"
      />
    )
  }

  const renderChecklist = (division: PayDivision) => (
    <DivisionChecklist
      division={division}
      pendingItemIds={pendingItemIds}
      onRecordTransfer={recordTransfer}
      onUndoTransfer={undoTransfer}
      onToggleEarmark={toggleEarmark}
      onDelete={deleteDivision}
      isDeleting={isDeleting}
    />
  )

  return (
    <section className="flex flex-col gap-4" aria-label="Recent divisions">
      <h2 className="text-lg font-semibold">Recent</h2>
      {payDivisions.map((division) => {
        if (!isDivisionDone(division)) {
          return <React.Fragment key={division.id}>{renderChecklist(division)}</React.Fragment>
        }
        const total = division.items.length
        return (
          <Collapsible
            key={division.id}
            open={openId === division.id}
            onOpenChange={(open) => setOpenId(open ? division.id : null)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="money-map-card-interactive w-full flex items-center justify-between gap-3 text-left"
              >
                <span className="flex flex-col">
                  <span className="font-medium">
                    {format(localDateFromIso(division.payDate), "MMM d, yyyy")} - {division.planName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <Money amount={division.payAmount} /> - {countDone(division)} of {total} done
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">{renderChecklist(division)}</CollapsibleContent>
          </Collapsible>
        )
      })}
    </section>
  )
}

export default RecentDivisions
