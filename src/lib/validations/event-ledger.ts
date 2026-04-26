import { z } from "zod";

export const eventLedgerQuerySchema = z.object({
  tagIds: z.string().min(1, "At least one tag is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().min(1).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(10),
});

export type EventLedgerQuery = z.infer<typeof eventLedgerQuerySchema>;

export const eventLedgerTagSchema = z.object({
  transactionId: z.string().min(1),
  transactionType: z.enum(["expense", "income"]),
  tagId: z.string().min(1),
});

export type EventLedgerTagInput = z.infer<typeof eventLedgerTagSchema>;

export const eventLedgerFormSchema = z.object({
  tagIds: z.array(z.string()).min(1, "Select at least one tag"),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  accountId: z.string().optional(),
});

export type EventLedgerFormValues = z.infer<typeof eventLedgerFormSchema>;
