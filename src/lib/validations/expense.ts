import * as z from "zod"
import { isMoneyString, MONEY_MESSAGE } from "./money";

export const ExpenseTypeValidation = z.object({
  name: z.string()
    .min(1, "Expense type name is required")
    .max(50, "Expense type name must be less than 50 characters"),

  monthlyBudget: z.string()
    .optional()
    .refine((val) => !val || isMoneyString(val), {
      message: MONEY_MESSAGE("Monthly budget")
    })
});