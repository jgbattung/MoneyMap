import { z } from "zod";

export const ExpenseTransactionValidation = z.object({
  accountId: z.string().min(1, "Account is required"),
  expenseTypeId: z.string().min(1, "Expense type is required"),
  expenseSubcategoryId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  description: z.string().optional(),
  
  isInstallment: z.boolean(),
  installmentDuration: z.number()
    .int()
    .positive("Duration must be positive")
    .optional()
    .nullable(),
  installmentStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
});

export const createExpenseTransactionSchema = ExpenseTransactionValidation.refine(
  (data) => {
    if (data.isInstallment) {
      return data.installmentDuration && data.installmentDuration > 0 && data.installmentStartDate;
    }

    if (!data.isInstallment) {
      return data.date !== undefined;
    }
    return true;
  },
  {
    message: "Duration and start date are required for installment expenses",
    path: ["installmentDuration"],
  }
);

export const updateExpenseTransactionSchema = ExpenseTransactionValidation.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export type ExpenseTransactionInput = z.infer<typeof createExpenseTransactionSchema>;
export type UpdateExpenseTransactionInput = z.infer<typeof updateExpenseTransactionSchema>;