import { z } from "zod";

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/**
 * Turns YYYY-MM-DD strings into a Prisma date filter: UTC midnight of the
 * start day (inclusive) up to UTC midnight of the day after the end day
 * (exclusive), so the whole end day is included.
 *
 * Uses UTC methods only, so the result never depends on the server's
 * timezone. This relies on the app-wide UTC+8 viewer assumption (the same one
 * `formatDateForAPI` bakes into writes) and covers both stored date shapes:
 * UTC-midnight rows from forms, and the installment cron's 00:0x UTC
 * wall-clock timestamps, which land on the correct UTC day.
 */
export function buildDateRange(
  startDate?: string,
  endDate?: string
): { gte?: Date; lt?: Date } | undefined {
  if (!startDate && !endDate) return undefined;

  const range: { gte?: Date; lt?: Date } = {};
  if (startDate) {
    range.gte = new Date(`${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    const lt = new Date(`${endDate}T00:00:00.000Z`);
    lt.setUTCDate(lt.getUTCDate() + 1);
    range.lt = lt;
  }
  return range;
}
