import * as z from "zod"
import { validatePlanLines } from "@/lib/pay-division"

const DECIMAL_2DP = /^\d+(\.\d{1,2})?$/

const decimalString = (label: string) =>
  z.string()
    .min(1, `${label} is required`)
    .regex(DECIMAL_2DP, `${label} must be a number with at most 2 decimals`)

export const PayPlanLineSchema = z.object({
  name: z.string().trim()
    .min(1, "Line name is required")
    .max(50, "Line name must be less than 50 characters"),
  kind: z.enum(["PERCENT", "FIXED"]),
  value: decimalString("Value"),
  from: z.enum(["SPEND", "SAVE"]).optional(),
}).superRefine((line, ctx) => {
  const value = Number(line.value)
  if (!(value > 0)) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Value must be greater than 0" })
  } else if (line.kind === "PERCENT" && value > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Percent cannot be over 100" })
  }
  if (line.kind === "FIXED" && !line.from) {
    ctx.addIssue({ code: "custom", path: ["from"], message: "Choose Spend or Save" })
  }
})

export const PayPlanSchema = z.object({
  name: z.string().trim()
    .min(1, "Plan name is required")
    .max(50, "Plan name must be less than 50 characters"),
  savePercent: z.string()
    .min(1, "Save percent is required")
    .regex(DECIMAL_2DP, "Save percent must be a number with at most 2 decimals")
    .refine((val) => Number(val) >= 0 && Number(val) <= 100, {
      message: "Save percent must be between 0 and 100",
    }),
  sourceAccountId: z.string().min(1, "Pay lands in is required"),
  saveAccountId: z.string().min(1, "Save account is required"),
  spendAccountId: z.string().min(1, "Spend account is required"),
  transferTypeId: z.string().min(1, "Transfer type is required"),
  lines: z.array(PayPlanLineSchema).max(20, "A plan can have at most 20 lines"),
}).superRefine((plan, ctx) => {
  const error = validatePlanLines(plan.savePercent, plan.lines)
  if (error) {
    ctx.addIssue({ code: "custom", path: ["lines"], message: error })
  }
})

export const CreatePayDivisionSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  payAmount: decimalString("Pay amount").refine((val) => Number(val) > 0, {
    message: "Pay amount must be greater than 0",
  }),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  incomeTransactionId: z.string().min(1).optional(),
})

export const RecordTransferSchema = z.object({
  amount: decimalString("Amount").refine((val) => Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
})

export type PayPlanInput = z.infer<typeof PayPlanSchema>
export type PayPlanLineInput = z.infer<typeof PayPlanLineSchema>
export type CreatePayDivisionInput = z.infer<typeof CreatePayDivisionSchema>
export type RecordTransferInput = z.infer<typeof RecordTransferSchema>
