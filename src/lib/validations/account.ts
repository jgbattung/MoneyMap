import * as z from "zod"

export const AccountValidation = z.object({
  name: z.string()
    .min(1, "Account name is required")
    .max(50, "Account name must be less than 50 characters"),

  accountType: z.enum([
    "CHECKING",
    "SAVINGS", 
    "CREDIT_CARD",
    "INVESTMENT",
    "CASH",
    "CRYPTO",
    "RETIREMENT",
    "REAL_ESTATE",
    "OTHER"
  ], {
    message: "Please select an account type"
  }),

  initialBalance: z.string()
    .min(1, "Initial balance is required")
    .refine((val) => !isNaN(Number(val)), {
      message: "Initial balance must be a valid number"
    }),

  addToNetWorth: z.boolean(),
  
  statementDate: z.number()
    .min(1, "Statement date must be between 1-31")
    .max(31, "Statement date must be between 1-31")
    .optional(),
  
  dueDate: z.number()
    .min(1, "Due date must be between 1-31") 
    .max(31, "Due date must be between 1-31")
    .optional(),
})