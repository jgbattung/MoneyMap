"use client"

import React, { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DeleteDialog from "@/components/shared/DeleteDialog"
import { useAccountsQuery } from "@/hooks/useAccountsQuery"
import { useTransferTypesQuery } from "@/hooks/useTransferTypesQuery"
import { usePayPlansQuery, type PayPlan } from "@/hooks/usePayPlansQuery"
import { useShakeOnError } from "@/hooks/useShakeOnError"
import { PayPlanSchema, type PayPlanInput } from "@/lib/validations/pay-division"
import { sumPercentBp } from "@/lib/pay-division"

type LineMode = "PERCENT" | "FIXED_SPEND" | "FIXED_SAVE"

const LINE_MODES: Array<{ value: LineMode; label: string }> = [
  { value: "PERCENT", label: "% of Save" },
  { value: "FIXED_SPEND", label: "Fixed (Spend)" },
  { value: "FIXED_SAVE", label: "Fixed (Save)" },
]

function modeOf(line: { kind: "PERCENT" | "FIXED"; from?: "SPEND" | "SAVE" }): LineMode {
  if (line.kind === "PERCENT") return "PERCENT"
  return line.from === "SAVE" ? "FIXED_SAVE" : "FIXED_SPEND"
}

function formatBp(bp: number): string {
  return (bp / 100).toString()
}

interface PayPlanFormProps {
  /** Omit to create a new plan. */
  plan?: PayPlan | null
  onDone: () => void
}

const PayPlanForm = ({ plan, onDone }: PayPlanFormProps) => {
  const isEdit = Boolean(plan)
  const { accounts } = useAccountsQuery()
  const { transferTypes } = useTransferTypesQuery()
  const { createPayPlan, updatePayPlan, deletePayPlan, isCreating, isUpdating, isDeleting } = usePayPlansQuery()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isSaving = isCreating || isUpdating

  const form = useForm<PayPlanInput>({
    resolver: zodResolver(PayPlanSchema),
    mode: "onTouched",
    defaultValues: {
      name: plan?.name ?? "",
      savePercent: plan?.savePercent ?? "",
      sourceAccountId: plan?.sourceAccountId ?? "",
      saveAccountId: plan?.saveAccountId ?? "",
      spendAccountId: plan?.spendAccountId ?? "",
      transferTypeId: plan?.transferTypeId ?? "",
      lines: plan?.lines ?? [],
    },
  })
  const { shakeClassName } = useShakeOnError(form.formState)
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" })

  const watchedLines = form.watch("lines")
  const totalBp = sumPercentBp(watchedLines ?? [])
  const hasPercentLines = (watchedLines ?? []).some((l) => l.kind === "PERCENT")
  const totalOk = totalBp === 10000
  const linesError = form.formState.errors.lines
  const linesMessage = linesError?.message ?? linesError?.root?.message

  const onSubmit = async (values: PayPlanInput) => {
    try {
      if (plan) {
        await updatePayPlan({ id: plan.id, ...values })
        toast.success("Plan updated", { description: `${values.name} has been saved.`, duration: 5000 })
      } else {
        await createPayPlan(values)
        toast.success("Plan created", { description: `${values.name} has been added.`, duration: 5000 })
      }
      onDone()
    } catch (error) {
      toast.error(isEdit ? "Failed to update plan" : "Failed to create plan", {
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        duration: 6000,
      })
    }
  }

  const onDelete = async () => {
    if (!plan) return
    try {
      await deletePayPlan(plan.id)
      toast.success("Plan deleted", {
        description: "Checklists already started from it are not changed.",
        duration: 5000,
      })
      setDeleteOpen(false)
      onDone()
    } catch (error) {
      toast.error("Failed to delete plan", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 6000,
      })
    }
  }

  const accountSelect = (
    name: "sourceAccountId" | "saveAccountId" | "spendAccountId",
    label: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard payday" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="savePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Save %</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      placeholder="30"
                      className="text-numeric"
                      {...field}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="transferTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transfer type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select transfer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {transferTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {accountSelect("sourceAccountId", "Pay lands in")}
          {accountSelect("saveAccountId", "Save goes to")}
          {accountSelect("spendAccountId", "Spend goes to")}

          <fieldset className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium">Lines</legend>
              <span
                className={`text-sm text-numeric ${
                  !hasPercentLines || totalOk ? "text-muted-foreground" : "text-text-error"
                }`}
                aria-live="polite"
              >
                % lines total {formatBp(totalBp)}
                {hasPercentLines && (totalOk ? " (ok)" : " (needs 100)")}
              </span>
            </div>

            {fields.map((item, index) => {
              const line = watchedLines?.[index] ?? item
              const rowErrors = form.formState.errors.lines?.[index]
              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9.5rem_6rem_auto] gap-2 items-start">
                    <Input
                      aria-label={`Line ${index + 1} name`}
                      placeholder="Line name"
                      disabled={isSaving}
                      {...form.register(`lines.${index}.name`)}
                    />
                    <Select
                      value={modeOf(line)}
                      onValueChange={(mode: LineMode) => {
                        form.setValue(`lines.${index}.kind`, mode === "PERCENT" ? "PERCENT" : "FIXED", {
                          shouldValidate: true,
                        })
                        form.setValue(
                          `lines.${index}.from`,
                          mode === "PERCENT" ? undefined : mode === "FIXED_SAVE" ? "SAVE" : "SPEND",
                          { shouldValidate: true }
                        )
                      }}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full" aria-label={`Line ${index + 1} type`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label={`Line ${index + 1} value`}
                      inputMode="decimal"
                      placeholder={line.kind === "PERCENT" ? "%" : "0.00"}
                      className="text-numeric"
                      disabled={isSaving}
                      {...form.register(`lines.${index}.value`)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => remove(index)}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {(rowErrors?.name || rowErrors?.value || rowErrors?.from) && (
                    <p className="text-sm text-text-error">
                      {rowErrors.name?.message ?? rowErrors.value?.message ?? rowErrors.from?.message}
                    </p>
                  )}
                </div>
              )
            })}

            {linesMessage && <p className="text-sm text-text-error" role="alert">{linesMessage}</p>}

            <Button
              type="button"
              variant="outline"
              className="w-fit hover:text-white"
              onClick={() => append({ name: "", kind: "PERCENT", value: "" })}
              disabled={isSaving || fields.length >= 20}
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          </fieldset>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" disabled={isSaving} className={shakeClassName}>
              {isSaving ? "Saving" : isEdit ? "Save changes" : "Create plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="hover:text-white"
              onClick={onDone}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="border-error-700 text-error-700 hover:bg-error-700 hover:text-white"
                onClick={() => setDeleteOpen(true)}
                disabled={isSaving}
              >
                Delete plan
              </Button>
            )}
          </div>
        </form>
      </Form>

      {plan && (
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={onDelete}
          itemName={plan.name}
          isDeleting={isDeleting}
          description={
            <>
              Delete the plan <span className="font-semibold">{plan.name}</span>? Checklists already
              started from it keep their amounts.
            </>
          }
        />
      )}
    </>
  )
}

export default PayPlanForm
