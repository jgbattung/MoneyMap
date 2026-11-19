import { z } from "zod";
import { isMoneyString, MONEY_MESSAGE } from "./money";

export const updateInstallmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.string()
    .refine((val) => isMoneyString(val), { message: MONEY_MESSAGE("Amount") })
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      { message: "Amount must be a positive number" }
    ),
  installmentStartDate: z.date(),
  expenseTypeId: z.string().min(1, "Expense type is required"),
  expenseSubcategoryId: z.string().optional(),
});
