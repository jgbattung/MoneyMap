import { z } from "zod";
import { dateOnlySchema } from "@/lib/report-date-range";

const REVERSED_RANGE_MESSAGE = "End date cannot be before start date";

export const eventLedgerQuerySchema = z
  .object({
    tagIds: z.string().optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    accountId: z.string().min(1).optional(),
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((v, ctx) => {
    // YYYY-MM-DD strings compare correctly as plain strings
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({
        code: "custom",
        message: REVERSED_RANGE_MESSAGE,
        path: ["endDate"],
      });
    }
    const hasTags = (v.tagIds ?? "")
      .split(",")
      .some((id) => id.trim().length > 0);
    if (!hasTags && !(v.startDate && v.endDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one tag or a date range",
        path: ["tagIds"],
      });
    }
  });

export type EventLedgerQuery = z.infer<typeof eventLedgerQuerySchema>;

const eventLedgerTagIdsShape = z.object({
  transactionIds: z.array(z.string().min(1)).min(1).max(50), // cap matches search page size
  transactionType: z.enum(["expense", "income"]),
  tagIds: z.array(z.string().min(1)).min(1),
});

// Date-range "Tag all": both dates are required so an unbounded
// "tag everything" request is impossible.
const eventLedgerTagFilterShape = z.object({
  filter: z
    .object({
      startDate: dateOnlySchema,
      endDate: dateOnlySchema,
      accountId: z.string().min(1).optional(),
    })
    .refine((f) => f.endDate >= f.startDate, {
      message: REVERSED_RANGE_MESSAGE,
      path: ["endDate"],
    }),
  tagIds: z.array(z.string().min(1)).min(1).max(10),
});

export const eventLedgerTagSchema = z.union([
  eventLedgerTagIdsShape,
  eventLedgerTagFilterShape,
]);

export type EventLedgerTagInput = z.infer<typeof eventLedgerTagSchema>;

export const eventLedgerFormSchema = z
  .object({
    mode: z.enum(["tag", "range"]),
    tagIds: z.array(z.string()),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
    accountId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "tag" && v.tagIds.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one tag",
        path: ["tagIds"],
      });
    }
    if (v.mode === "range") {
      if (!v.startDate) {
        ctx.addIssue({
          code: "custom",
          message: "Select a start date",
          path: ["startDate"],
        });
      }
      if (!v.endDate) {
        ctx.addIssue({
          code: "custom",
          message: "Select an end date",
          path: ["endDate"],
        });
      }
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({
        code: "custom",
        message: REVERSED_RANGE_MESSAGE,
        path: ["endDate"],
      });
    }
  });

export type EventLedgerFormValues = z.infer<typeof eventLedgerFormSchema>;
