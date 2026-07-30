import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date",
  });

const MAX_RANGE_DAYS = 62;

export const calendarSummaryQuerySchema = z
  .object({
    start: dateStringSchema,
    end: dateStringSchema,
  })
  .refine((data) => new Date(data.end).getTime() >= new Date(data.start).getTime(), {
    message: "end must not be before start",
    path: ["end"],
  })
  .refine(
    (data) => {
      const diffDays =
        (new Date(data.end).getTime() - new Date(data.start).getTime()) /
        (1000 * 60 * 60 * 24);
      return diffDays <= MAX_RANGE_DAYS;
    },
    {
      message: `Range cannot exceed ${MAX_RANGE_DAYS} days`,
      path: ["end"],
    }
  );

export type CalendarSummaryQuery = z.infer<typeof calendarSummaryQuerySchema>;

export const calendarDayQuerySchema = z.object({
  date: dateStringSchema,
});

export type CalendarDayQuery = z.infer<typeof calendarDayQuerySchema>;
