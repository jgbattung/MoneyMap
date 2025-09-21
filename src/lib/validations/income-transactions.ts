import * as z from "zod"

export const IncomeTransactionValidation = z.object({
  name: z.string()
    .min(1, "Transaction name is required")
    .max(100, "Transaction name must be less than 100 characters"),

  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a valid positive number"
    }),

  accountId: z.string()
    .min(1, "Account is required"),

  incomeTypeId: z.string()
    .min(1, "Income type is required"),

  date: z.string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Date must be a valid date"
    }),

  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional()
});