import * as z from "zod"

export const ExpenseTypeValidation = z.object({
  name: z.string()
    .min(1, "Expense type name is required")
    .max(50, "Expense type name must be less than 50 characters"),

  monthlyBudget: z.string()
    .optional()
    .refine((val) => !val || !isNaN(Number(val)), {
      message: "Monthly budget must be a valid number"
    })
});