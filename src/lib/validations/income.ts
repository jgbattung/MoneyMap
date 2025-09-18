import * as z from "zod"

export const IncomeTypeValidation = z.object({
  name: z.string()
    .min(1, "Income type name is required")
    .max(50, "Income type name must be less than 50 characters"),

  monthlyTarget: z.string()
    .optional()
    .refine((val) => !val || !isNaN(Number(val)), {
      message: "Monthly target must be a valid number"
    })
});