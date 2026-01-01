import * as z from "zod"

export const TransferTransactionValidation = z.object({
  name: z.string()
    .min(1, "Transfer name is required")
    .max(100, "Transfer name must be less than 100 characters"),
  
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  
  fromAccountId: z.string()
    .min(1, "From account is required"),
  
  toAccountId: z.string()
    .min(1, "To account is required"),
  
  transferTypeId: z.string()
    .min(1, "Transfer type is required"),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  
  notes: z.string().optional(),

  feeAmount: z.string()
  .optional()
  .refine((val) => {
    if (!val || val === "") return true;
    return !isNaN(Number(val)) && Number(val) > 0;
  }, {
    message: "Fee amount must be a positive number",
  }),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "From account and to account must be different",
  path: ["toAccountId"],
});