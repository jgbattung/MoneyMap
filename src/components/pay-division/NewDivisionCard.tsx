"use client"

import React, { useMemo, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ChevronDownIcon, Split } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { useIncomeTransactionsQuery } from "@/hooks/useIncomeTransactionsQuery"
import { usePayDivisionsQuery } from "@/hooks/usePayDivisionsQuery"
import { usePayPlansQuery } from "@/hooks/usePayPlansQuery"
import { computePayDivision, fromCentavos, isPlanUsable } from "@/lib/pay-division"
import { formatDateForAPI } from "@/lib/utils"
import { Money } from "./Money"

const NO_INCOME = "none"

/** "34495." -> "34495", ".5" -> "0.5". Returns the input unchanged when it is not a plain number. */
function normalizeAmount(raw: string): string {
  if (!/^\d*\.?\d*$/.test(raw)) return raw
  let value = raw.endsWith(".") ? raw.slice(0, -1) : raw
  if (value.startsWith(".")) value = `0${value}`
  return value
}

/** Parses the date part of an ISO string as a local date, so the day never shifts. */
function localDateFromIso(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

interface NewDivisionCardProps {
  onGoToPlans: () => void
}

const NewDivisionCard = ({ onGoToPlans }: NewDivisionCardProps) => {
  const { payPlans, isLoading: plansLoading } = usePayPlansQuery()
  const { payDivisions, createDivision, isCreating } = usePayDivisionsQuery()
  const { incomeTransactions } = useIncomeTransactionsQuery({ take: 5 })

  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState<Date>(() => new Date())
  const [planId, setPlanId] = useState("")
  const [incomeId, setIncomeId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const dividedIncomeIds = useMemo(
    () => new Set(payDivisions.map((d) => d.incomeTransactionId).filter((id): id is string => Boolean(id))),
    [payDivisions]
  )

  const plan = payPlans.find((p) => p.id === planId)
  const amount = normalizeAmount(payAmount)
  const tooManyDecimals = (amount.split(".")[1]?.length ?? 0) > 2

  const preview = useMemo(() => {
    if (!plan || !isPlanUsable(plan) || amount === "" || tooManyDecimals) return null
    return computePayDivision({ payAmount: amount, savePercent: plan.savePercent, lines: plan.lines })
  }, [plan, amount, tooManyDecimals])

  const canStart = Boolean(plan && isPlanUsable(plan) && preview?.ok) && !isCreating

  const pickIncome = (value: string) => {
    if (value === NO_INCOME) {
      setIncomeId(null)
      return
    }
    const income = incomeTransactions.find((t) => t.id === value)
    if (!income) return
    setIncomeId(income.id)
    setPayAmount(income.amount)
    setPayDate(localDateFromIso(income.date))
  }

  const start = async () => {
    if (!plan || !canStart) return
    try {
      await createDivision({
        planId: plan.id,
        payAmount: amount,
        payDate: formatDateForAPI(payDate),
        ...(incomeId ? { incomeTransactionId: incomeId } : {}),
      })
      toast.success("Checklist started", {
        description: `${plan.name} split saved. Tick each transfer as you make it.`,
        duration: 5000,
      })
      setPayAmount("")
      setIncomeId(null)
      setPayDate(new Date())
    } catch {
      // The hook already shows an error toast.
    }
  }

  if (plansLoading) {
    return (
      <div className="money-map-card flex flex-col gap-4" data-testid="new-division-skeleton">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (payPlans.length === 0) {
    return (
      <div className="money-map-card">
        <EmptyState
          icon={Split}
          title="No plans yet"
          description="Create a plan first. It sets where pay lands, where Save and Spend go, and how Save is split."
          action={{ label: "Go to Plans", onClick: onGoToPlans }}
          variant="widget"
        />
      </div>
    )
  }

  return (
    <div className="money-map-card flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Divide a paycheck</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-amount">Pay amount</Label>
          <CurrencyInput
            id="pay-amount"
            placeholder="0"
            value={payAmount}
            onValueChange={setPayAmount}
            disabled={isCreating}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Use recent income</Label>
          <Select value={incomeId ?? NO_INCOME} onValueChange={pickIncome} disabled={isCreating}>
            <SelectTrigger className="w-full" aria-label="Use recent income">
              <SelectValue placeholder="Type an amount instead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_INCOME}>Type an amount instead</SelectItem>
              {incomeTransactions.map((t) => (
                <SelectItem key={t.id} value={t.id} disabled={dividedIncomeIds.has(t.id)}>
                  {t.name} - ₱{parseFloat(t.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  {dividedIncomeIds.has(t.id) ? " (already divided)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Pay date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal hover:text-white"
                disabled={isCreating}
              >
                {format(payDate, "MMMM, d, yyyy")}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={payDate}
                captionLayout="dropdown"
                onDayClick={(date) => {
                  setPayDate(date)
                  setCalendarOpen(false)
                }}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Plan</Label>
          <Select value={planId} onValueChange={setPlanId} disabled={isCreating}>
            <SelectTrigger className="w-full" aria-label="Plan">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {payPlans.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={!isPlanUsable(p)}>
                  {p.name}
                  {isPlanUsable(p) ? "" : " (incomplete - fix it in Plans)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        {tooManyDecimals && <p className="text-sm text-text-error">Pay can have at most 2 decimals</p>}
        {preview && !preview.ok && <p className="text-sm text-text-error">{preview.error}</p>}
        {preview?.ok && plan && (
          <dl className="flex flex-col gap-1 rounded-lg border border-border/50 p-3 text-sm">
            <div className="flex justify-between">
              <dt>Spend</dt>
              <dd>
                <Money amount={fromCentavos(preview.spendC)} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Save ({parseFloat(plan.savePercent)}%)</dt>
              <dd>
                <Money amount={fromCentavos(preview.saveC)} />
              </dd>
            </div>
            {preview.lines.map((line, i) => (
              <div key={`${line.name}-${i}`} className="flex justify-between pl-4 text-muted-foreground">
                <dt>
                  {line.name} ({line.kind === "PERCENT" ? line.detail : `fixed from ${line.from === "SAVE" ? "Save" : "Spend"}`})
                </dt>
                <dd>
                  <Money amount={fromCentavos(line.amountC)} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {!preview && !tooManyDecimals && (
          <p className="text-sm text-muted-foreground">Enter a pay amount and pick a plan to see the split.</p>
        )}
      </div>

      <Button onClick={start} disabled={!canStart} className="md:w-fit">
        {isCreating ? "Starting" : "Start checklist"}
      </Button>
    </div>
  )
}

export default NewDivisionCard
