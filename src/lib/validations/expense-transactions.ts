import { z } from "zod";

export const expenseTransactionSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  expenseTypeId: z.string().min(1, "Expense type is required"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  date: z.date({
    message: "Date is required",
  }),
  description: z.string().optional(),
  
  isInstallment: z.boolean().default(false),
  installmentDuration: z.number()
    .int()
    .positive("Duration must be positive")
    .optional()
    .nullable(),
  installmentStartDate: z.date().optional().nullable(),
});

export const createExpenseTransactionSchema = expenseTransactionSchema.refine(
  (data) => {
    if (data.isInstallment) {
      return data.installmentDuration && data.installmentDuration > 0 && data.installmentStartDate;
    }
    return true;
  },
  {
    message: "Duration and start date are required for installment expenses",
    path: ["installmentDuration"],
  }
);

export const updateExpenseTransactionSchema = expenseTransactionSchema.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export type ExpenseTransactionInput = z.infer<typeof createExpenseTransactionSchema>;
export type UpdateExpenseTransactionInput = z.infer<typeof updateExpenseTransactionSchema>;