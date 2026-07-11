import { z } from "zod";

// Server-side schema for API query param validation
export const transactionAnalysisQuerySchema = z.object({
  type: z.enum(["expense", "income"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryIds: z.string().optional(),
  subcategoryIds: z.string().optional(),
  tagIds: z.string().optional(),
  accountId: z.string().min(1).optional(),
  search: z.string().max(100).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(5),
});

export type TransactionAnalysisQuery = z.infer<typeof transactionAnalysisQuerySchema>;

// Client-side schema for React Hook Form
export const transactionAnalysisFormSchema = z
  .object({
    type: z.enum(["expense", "income"]),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
    categoryIds: z.array(z.string()).default([]),
    subcategoryIds: z.array(z.string()).default([]),
    tagIds: z.array(z.string()).optional(),
    accountId: z.string().optional(),
    search: z.string().max(100).optional(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: "End date cannot be before start date", path: ["endDate"] }
  );

export type TransactionAnalysisFormValues = z.infer<typeof transactionAnalysisFormSchema>;
