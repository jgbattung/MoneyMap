import * as z from "zod"
import { isMoneyString, MONEY_MESSAGE } from "./money";

export const IncomeTypeValidation = z.object({
  name: z.string()
    .min(1, "Income type name is required")
    .max(50, "Income type name must be less than 50 characters"),

  monthlyTarget: z.string()
    .optional()
    .refine((val) => !val || isMoneyString(val), {
      message: MONEY_MESSAGE("Monthly target")
    })
});