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
  date: z.date().optional(),
  description: z.string().optional(),
  
  isInstallment: z.boolean(),
  installmentDuration: z.number()
    .int()
    .positive("Duration must be positive")
    .optional()
    .nullable(),
  installmentStartDate: z.date().optional().nullable(),
  tagIds: z.array(z.string()).max(10).optional(),
});

export const createExpenseTransactionSchema = ExpenseTransactionValidation.superRefine(
  (data, ctx) => {
    if (data.isInstallment) {
      if (!data.installmentDuration || data.installmentDuration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duration is required for installment expenses",
          path: ["installmentDuration"],
        });
      }
      if (!data.installmentStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date is required for installment expenses",
          path: ["installmentStartDate"],
        });
      }
    } else {
      if (data.date === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date is required",
          path: ["date"],
        });
      }
    }
  }
);

export const updateExpenseTransactionSchema = ExpenseTransactionValidation.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export type ExpenseTransactionInput = z.infer<typeof createExpenseTransactionSchema>;
export type UpdateExpenseTransactionInput = z.infer<typeof updateExpenseTransactionSchema>;